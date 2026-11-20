import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, isNull, notExists, notInArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { computers } from '../../../lib/db/schema/computers.schema';
import { ticketComputers } from '../../../lib/db/schema/ticket-computers.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

/** A mesma tabela, de novo: para perguntar "esta máquina já voltou ao chamado?". */
const activeComputers = alias(ticketComputers, 'active_ticket_computers');

/** Uma máquina como o chamado a mostra: o id e o nome de tela. */
export type TicketComputer = { id: number; name: string };

/**
 * As MÁQUINAS dos chamados (ver `ticket-computers.schema`). Só lê e grava: quem pode vincular
 * e o que vai para a linha do tempo é regra do service.
 */
@Injectable()
export class TicketComputersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** As máquinas de vários chamados de uma vez, na ordem em que foram vinculadas. */
  async listFor(ticketIds: readonly number[]): Promise<Map<number, TicketComputer[]>> {
    const byTicket = new Map<number, TicketComputer[]>();
    if (ticketIds.length === 0) return byTicket;

    const rows = await runQuery(
      this.db
        .select({
          ticketId: ticketComputers.ticketId,
          id: computers.id,
          name: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
        })
        .from(ticketComputers)
        .innerJoin(computers, eq(computers.id, ticketComputers.computerId))
        .where(and(inArray(ticketComputers.ticketId, [...ticketIds]), isNull(ticketComputers.archivedAt)))
        .orderBy(asc(ticketComputers.createdAt), asc(ticketComputers.id)),
      'listar as máquinas dos chamados',
    );

    for (const row of rows) {
      const list = byTicket.get(row.ticketId) ?? [];
      list.push({ id: row.id, name: row.name });
      byTicket.set(row.ticketId, list);
    }

    return byTicket;
  }

  /** Os ids que de fato existem no inventário — o resto veio de uma tela e não vale. */
  async existingIds(ids: readonly number[]): Promise<number[]> {
    if (ids.length === 0) return [];

    const rows = await runQuery(
      this.db.select({ id: computers.id }).from(computers).where(inArray(computers.id, [...ids])),
      'conferir as máquinas do inventário',
    );

    return rows.map((row) => row.id);
  }

  /**
   * TROCA a lista de máquinas do chamado pela escolhida: tira as que saíram (ARQUIVA, com quem
   * tirou), soma as novas, e a primeira da lista vira a `computer_id` do chamado. Tudo junto, ou
   * nada.
   */
  async replace(
    ticketId: number,
    ids: readonly number[],
    createdBy: string,
    actorId: string | null = null,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const ofTicket = and(eq(ticketComputers.ticketId, ticketId), isNull(ticketComputers.archivedAt));
      await runQuery(
        tx
          .update(ticketComputers)
          .set(archiveValues(true, actorId))
          .where(
            ids.length > 0 ? and(ofTicket, notInArray(ticketComputers.computerId, [...ids])) : ofTicket,
          ),
        'desvincular máquinas do chamado',
      );

      if (ids.length > 0) {
        await runQuery(
          tx
            .insert(ticketComputers)
            .values(ids.map((computerId) => ({ ticketId, computerId, createdBy })))
            .onConflictDoNothing(),
          'vincular máquinas ao chamado',
        );
      }

      await runQuery(
        tx
          .update(tickets)
          .set({ computerId: ids[0] ?? null, updatedAt: new Date(), updatedBy: createdBy })
          .where(eq(tickets.id, ticketId)),
        'guardar a primeira máquina do chamado',
      );
    });
  }

  /** As máquinas tiradas do chamado que não voltaram por outro caminho — o bloco "Removidos". */
  async listArchived(ticketId: number): Promise<{ id: number; computerId: number; name: string; archivedAt: Date | null }[]> {
    return runQuery(
      this.db
        .select({
          id: ticketComputers.id,
          computerId: ticketComputers.computerId,
          name: sql<string>`coalesce(${computers.displayName}, ${computers.name})`,
          archivedAt: ticketComputers.archivedAt,
        })
        .from(ticketComputers)
        .innerJoin(computers, eq(computers.id, ticketComputers.computerId))
        .where(
          and(
            eq(ticketComputers.ticketId, ticketId),
            isNotNull(ticketComputers.archivedAt),
            notExists(
              this.db
                .select({ id: activeComputers.id })
                .from(activeComputers)
                .where(
                  and(
                    eq(activeComputers.ticketId, ticketComputers.ticketId),
                    eq(activeComputers.computerId, ticketComputers.computerId),
                    isNull(activeComputers.archivedAt),
                  ),
                ),
            ),
          ),
        )
        .orderBy(desc(ticketComputers.archivedAt)),
      'listar máquinas tiradas do chamado',
    );
  }

  async findInTicket(ticketId: number, id: number): Promise<{ id: number; computerId: number } | null> {
    return runMaybe(
      this.db
        .select({ id: ticketComputers.id, computerId: ticketComputers.computerId })
        .from(ticketComputers)
        .where(and(eq(ticketComputers.ticketId, ticketId), eq(ticketComputers.id, id)))
        .limit(1),
      'ler máquina do chamado',
    );
  }

  /**
   * Devolve a máquina tirada ao chamado. Se ele ficou sem máquina nenhuma, ela volta a ser a
   * primeira (`computer_id`). Se ela já voltou por outro caminho, o índice único recusa (409).
   */
  async restore(ticketId: number, id: number, computerId: number, actorEmail: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await runQuery(
        tx.update(ticketComputers).set(archiveValues(false, null)).where(eq(ticketComputers.id, id)),
        'devolver máquina ao chamado',
      );
      await runQuery(
        tx
          .update(tickets)
          .set({ computerId, updatedAt: new Date(), updatedBy: actorEmail })
          .where(and(eq(tickets.id, ticketId), isNull(tickets.computerId))),
        'guardar a primeira máquina do chamado',
      );
    });
  }
}
