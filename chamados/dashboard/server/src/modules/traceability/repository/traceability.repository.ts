import { Inject, Injectable } from '@nestjs/common';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { isClosedTicketStatus } from '@template/shared/domain/ticket-status.util';
import { type TraceabilityFacts } from '@template/shared/domain/traceability-graph.util';
import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { computerResponsibleHistory } from '../../../lib/db/schema/computer-responsible-history.schema';
import { computers } from '../../../lib/db/schema/computers.schema';
import { partMovements } from '../../../lib/db/schema/part-movements.schema';
import { parts } from '../../../lib/db/schema/parts.schema';
import { taskLinks, tasks } from '../../../lib/db/schema/tasks.schema';
import { ticketComputers } from '../../../lib/db/schema/ticket-computers.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

/** Quantos chamados entram por máquina no mapa de UMA máquina — os mais recentes. */
export const MAX_TICKETS_PER_COMPUTER = 30;

export type FactsScope = {
  computerIds: number[];
  /** Responsáveis: todos os períodos, só os atuais, ou só os de uma pessoa. */
  responsibles: 'all' | 'current' | { personId: string };
  /** Chamados: todos (mapa de uma máquina) ou só os abertos (departamento, pessoa). */
  tickets: 'all' | 'open';
  withParts: boolean;
};

/** Os fatos do mapa, lidos do banco. Os nomes (departamento, pessoa) entram no service. */
@Injectable()
export class TraceabilityRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async computerIdsOfDepartment(departmentId: number): Promise<number[]> {
    const rows = await runQuery(
      this.db
        .select({ id: computers.id })
        .from(computers)
        .where(and(eq(computers.departmentId, departmentId), isNull(computers.disposedAt))),
      'máquinas do departamento',
    );

    return rows.map((row) => row.id);
  }

  /** Toda máquina que a pessoa já teve — pelo histórico — ou tem agora. */
  /** Quantas máquinas (fora do descarte) cada pessoa responde hoje, pelo id. */
  async computersByResponsible(): Promise<Map<string, number>> {
    const rows = await runQuery(
      this.db
        .select({ responsibleId: computers.responsibleId, total: sql<number>`count(*)::int` })
        .from(computers)
        .where(sql`${computers.responsibleId} is not null`)
        .groupBy(computers.responsibleId),
      'máquinas por responsável',
    );

    return new Map(rows.map((row) => [row.responsibleId!, row.total]));
  }

  async computerIdsOfPerson(personId: string): Promise<number[]> {
    const [history, current] = await Promise.all([
      runQuery(
        this.db
          .selectDistinct({ id: computerResponsibleHistory.computerId })
          .from(computerResponsibleHistory)
          .where(eq(computerResponsibleHistory.responsibleId, personId)),
        'máquinas que a pessoa teve',
      ),
      runQuery(
        this.db
          .select({ id: computers.id })
          .from(computers)
          .where(eq(computers.responsibleId, personId)),
        'máquinas da pessoa',
      ),
    ]);

    return [...new Set([...history, ...current].map((row) => row.id))];
  }

  async facts(scope: FactsScope): Promise<Omit<TraceabilityFacts, 'departmentName' | 'person'>> {
    const ids = scope.computerIds;
    if (!ids.length) return { computers: [], responsibles: [], tickets: [], parts: [], tasks: [] };
    const [machines, responsibles, ticketRows, partRows, taskRows] = await Promise.all([
      this.machines(ids),
      this.responsibles(ids, scope.responsibles),
      this.tickets(ids, scope.tickets),
      scope.withParts ? this.parts(ids) : Promise.resolve([]),
      this.openTasks(ids),
    ]);

    return {
      computers: machines,
      responsibles,
      tickets: ticketRows,
      parts: partRows,
      tasks: taskRows,
    };
  }

  private async machines(ids: number[]): Promise<TraceabilityFacts['computers']> {
    const rows = await runQuery(
      this.db
        .select({
          id: computers.id,
          name: computers.name,
          displayName: computers.displayName,
          departmentId: computers.departmentId,
        })
        .from(computers)
        .where(inArray(computers.id, ids)),
      'máquinas do mapa',
    );

    return rows.map((row) => ({
      id: row.id,
      label: row.displayName ?? row.name,
      sublabel: row.displayName ? row.name : null,
      departmentId: row.departmentId,
    }));
  }

  private async responsibles(
    ids: number[],
    which: FactsScope['responsibles'],
  ): Promise<TraceabilityFacts['responsibles']> {
    const filters = [inArray(computerResponsibleHistory.computerId, ids)];
    if (which === 'current') filters.push(isNull(computerResponsibleHistory.endedAt));
    if (typeof which === 'object')
      filters.push(eq(computerResponsibleHistory.responsibleId, which.personId));
    const [history, current] = await Promise.all([
      runQuery(
        this.db
          .select({
            computerId: computerResponsibleHistory.computerId,
            personId: computerResponsibleHistory.responsibleId,
            isCurrent: sql<boolean>`${computerResponsibleHistory.endedAt} is null`,
          })
          .from(computerResponsibleHistory)
          .where(and(...filters)),
        'responsáveis do mapa',
      ),
      /* O responsável atual pela própria máquina: cobre a que ainda não tem período gravado. */
      runQuery(
        this.db
          .select({ computerId: computers.id, personId: computers.responsibleId })
          .from(computers)
          .where(inArray(computers.id, ids)),
        'responsável atual das máquinas',
      ),
    ]);
    const periods = new Map(
      history.map((row) => [`${row.computerId}:${row.personId}:${row.isCurrent}`, row]),
    );
    for (const row of current) {
      if (!row.personId) continue;
      if (typeof which === 'object' && row.personId !== which.personId) continue;
      periods.set(`${row.computerId}:${row.personId}:true`, {
        computerId: row.computerId,
        personId: row.personId,
        isCurrent: true,
      });
    }

    return [...periods.values()];
  }

  private async tickets(
    ids: number[],
    which: FactsScope['tickets'],
  ): Promise<TraceabilityFacts['tickets']> {
    const linked = this.db
      .select({ ticketId: ticketComputers.ticketId })
      .from(ticketComputers)
      .where(inArray(ticketComputers.computerId, ids));
    const rows = await runQuery(
      this.db
        .select({
          id: tickets.id,
          computerId: tickets.computerId,
          linkedComputerId: sql<number | null>`(
            select tc.computer_id from ${ticketComputers} tc
            where tc.ticket_id = ${tickets.id} and tc.computer_id in (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `,
            )})
            limit 1
          )`,
          status: tickets.status,
          description: tickets.description,
        })
        .from(tickets)
        .where(or(inArray(tickets.computerId, ids), inArray(tickets.id, linked)))
        .orderBy(desc(tickets.createdAt))
        .limit(MAX_TICKETS_PER_COMPUTER * ids.length),
      'chamados do mapa',
    );

    return rows.flatMap((row) => {
      const isOpen = !isClosedTicketStatus(row.status);
      if (which === 'open' && !isOpen) return [];
      const computerId =
        row.computerId && ids.includes(row.computerId) ? row.computerId : row.linkedComputerId;
      if (!computerId) return [];
      const title = row.description.replace(/\s+/g, ' ').trim();

      return [
        {
          id: row.id,
          computerId,
          protocol: formatTicketProtocol(row.id),
          title: title.length > 60 ? `${title.slice(0, 57)}…` : title,
          isOpen,
        },
      ];
    });
  }

  private async parts(ids: number[]): Promise<TraceabilityFacts['parts']> {
    return runQuery(
      this.db
        .select({
          partId: partMovements.partId,
          computerId: sql<number>`${partMovements.computerId}`,
          name: parts.name,
          quantity: sql<number>`sum(${partMovements.quantity})::int`,
        })
        .from(partMovements)
        .innerJoin(parts, eq(parts.id, partMovements.partId))
        .where(and(inArray(partMovements.computerId, ids), eq(partMovements.type, 'out')))
        .groupBy(partMovements.partId, partMovements.computerId, parts.name),
      'peças usadas nas máquinas',
    );
  }

  /** As tarefas em aberto que tocam a máquina — nascidas dela ou vinculadas a ela. */
  private async openTasks(ids: number[]): Promise<TraceabilityFacts['tasks']> {
    const [own, linked] = await Promise.all([
      runQuery(
        this.db
          .select({
            id: tasks.id,
            computerId: sql<number>`${tasks.computerId}`,
            title: tasks.title,
          })
          .from(tasks)
          .where(and(inArray(tasks.computerId, ids), ne(tasks.status, 'done'))),
        'tarefas das máquinas',
      ),
      runQuery(
        this.db
          .select({ id: tasks.id, computerId: taskLinks.targetId, title: tasks.title })
          .from(taskLinks)
          .innerJoin(tasks, eq(tasks.id, taskLinks.taskId))
          .where(
            and(
              eq(taskLinks.kind, 'computer'),
              inArray(taskLinks.targetId, ids),
              ne(tasks.status, 'done'),
            ),
          ),
        'tarefas vinculadas às máquinas',
      ),
    ]);
    const unique = new Map([...own, ...linked].map((row) => [`${row.id}:${row.computerId}`, row]));

    return [...unique.values()].map((row) => ({ ...row, isOpen: true }));
  }
}
