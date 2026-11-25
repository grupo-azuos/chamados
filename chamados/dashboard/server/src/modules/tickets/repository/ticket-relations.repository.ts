import { Inject, Injectable } from '@nestjs/common';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type TicketRelation } from '@template/shared/schemas/ticket-relation.schema';
import { and, desc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';

import { archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { ticketRelations, type TicketRelationRow } from '../../../lib/db/schema/ticket-relations.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

@Injectable()
export class TicketRelationsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Lista os chamados vinculados ao chamado informado (em qualquer direção da relação).
   */
  async listByTicket(ticketId: number): Promise<TicketRelation[]> {
    const relations = await runQuery(
      this.db
        .select()
        .from(ticketRelations)
        .where(and(involving(ticketId), isNull(ticketRelations.archivedAt)))
        .orderBy(desc(ticketRelations.createdAt), desc(ticketRelations.id)),
      'listar relações do chamado',
    );

    if (relations.length === 0) return [];

    const otherIds = relations.map((rel) =>
      rel.ticketId === ticketId ? rel.relatedTicketId : rel.ticketId,
    );

    const ticketRows = await runQuery(
      this.db.select().from(tickets).where(inArray(tickets.id, otherIds)),
      'buscar dados dos chamados vinculados',
    );

    const ticketMap = new Map(ticketRows.map((t) => [t.id, t]));

    const result: TicketRelation[] = [];
    for (const rel of relations) {
      const targetId = rel.ticketId === ticketId ? rel.relatedTicketId : rel.ticketId;
      const target = ticketMap.get(targetId);
      if (!target) continue;

      result.push({
        id: rel.id,
        ticketId,
        relatedTicketId: targetId,
        relatedTicket: {
          id: target.id,
          protocol: formatTicketProtocol(target.id),
          description: target.description,
          status: target.status,
          priority: target.priority,
          area: target.area,
          requesterName: target.requesterName,
          createdAt: target.createdAt.toISOString(),
        },
        createdAt: rel.createdAt.toISOString(),
        createdBy: rel.createdBy,
      });
    }

    return result;
  }

  /**
   * Vincula dois chamados. Se já estiverem vinculados (em qualquer direção), não faz nada.
   */
  async add(ticketId: number, relatedTicketId: number, createdBy: string): Promise<void> {
    const existing = await runQuery(
      this.db
        .select({ id: ticketRelations.id })
        .from(ticketRelations)
        .where(and(pair(ticketId, relatedTicketId), isNull(ticketRelations.archivedAt)))
        .limit(1),
      'conferir se chamados já estão vinculados',
    );

    if (existing.length > 0) return;

    await runQuery(
      this.db.insert(ticketRelations).values({ ticketId, relatedTicketId, createdBy }),
      'vincular chamado',
    );
  }

  /**
   * Desfaz o vínculo entre dois chamados (em qualquer direção): ARQUIVA a linha.
   */
  async remove(ticketId: number, relatedTicketId: number, actorId: string | null): Promise<void> {
    await runQuery(
      this.db
        .update(ticketRelations)
        .set(archiveValues(true, actorId))
        .where(and(pair(ticketId, relatedTicketId), isNull(ticketRelations.archivedAt))),
      'desvincular chamado',
    );
  }

  /** Os vínculos desfeitos deste chamado — o bloco "Removidos". */
  async listArchived(ticketId: number): Promise<TicketRelationRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketRelations)
        .where(and(involving(ticketId), isNotNull(ticketRelations.archivedAt)))
        .orderBy(desc(ticketRelations.archivedAt)),
      'listar vínculos desfeitos do chamado',
    );
  }

  async findInTicket(ticketId: number, id: number): Promise<TicketRelationRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(ticketRelations)
        .where(and(eq(ticketRelations.id, id), involving(ticketId)))
        .limit(1),
      'ler vínculo do chamado',
    );
  }

  /** O vínculo valendo entre os dois chamados, se houver. */
  async findActivePair(ticketId: number, relatedTicketId: number): Promise<{ id: number } | null> {
    return runMaybe(
      this.db
        .select({ id: ticketRelations.id })
        .from(ticketRelations)
        .where(and(pair(ticketId, relatedTicketId), isNull(ticketRelations.archivedAt)))
        .limit(1),
      'conferir vínculo valendo',
    );
  }

  async restore(id: number): Promise<void> {
    await runQuery(
      this.db.update(ticketRelations).set(archiveValues(false, null)).where(eq(ticketRelations.id, id)),
      'refazer vínculo de chamados',
    );
  }
}

/** O chamado em qualquer ponta do vínculo. */
function involving(ticketId: number) {
  return or(eq(ticketRelations.ticketId, ticketId), eq(ticketRelations.relatedTicketId, ticketId));
}

/** Os dois chamados, em qualquer direção. */
function pair(ticketId: number, relatedTicketId: number) {
  return or(
    and(eq(ticketRelations.ticketId, ticketId), eq(ticketRelations.relatedTicketId, relatedTicketId)),
    and(eq(ticketRelations.ticketId, relatedTicketId), eq(ticketRelations.relatedTicketId, ticketId)),
  );
}
