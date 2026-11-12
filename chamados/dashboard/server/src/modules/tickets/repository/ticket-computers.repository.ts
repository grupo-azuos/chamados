import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { runQuery } from '../../../lib/db/db-error.util';
import { computers } from '../../../lib/db/schema/computers.schema';
import { ticketComputers } from '../../../lib/db/schema/ticket-computers.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

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
        .where(inArray(ticketComputers.ticketId, [...ticketIds]))
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
   * TROCA a lista de máquinas do chamado pela escolhida: tira as que saíram, soma as novas, e
   * a primeira da lista vira a `computer_id` do chamado. Tudo junto, ou nada.
   */
  async replace(ticketId: number, ids: readonly number[], createdBy: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await runQuery(
        tx
          .delete(ticketComputers)
          .where(
            ids.length > 0
              ? and(
                  eq(ticketComputers.ticketId, ticketId),
                  notInArray(ticketComputers.computerId, [...ids]),
                )
              : eq(ticketComputers.ticketId, ticketId),
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
}
