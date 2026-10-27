import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { runQuery } from '../../../lib/db/db-error.util';
import {
  type TicketWatcherRow,
  ticketWatchers,
} from '../../../lib/db/schema/ticket-watchers.schema';

/** Uma pessoa a vincular: o id do admin-console e o nome dela hoje. */
export type WatcherToAdd = { userId: string; userName: string };

/**
 * As PESSOAS VINCULADAS dos chamados (ver `ticket-watchers.schema`). Só lê e grava: quem pode
 * vincular quem é regra do service.
 */
@Injectable()
export class TicketWatchersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** As pessoas de um chamado, na ordem em que foram vinculadas. */
  async listByTicket(ticketId: number): Promise<TicketWatcherRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketWatchers)
        .where(eq(ticketWatchers.ticketId, ticketId))
        .orderBy(asc(ticketWatchers.createdAt), asc(ticketWatchers.id)),
      'listar as pessoas vinculadas ao chamado',
    );
  }

  /** Os chamados em que esta pessoa está vinculada — o lado dela de "Meus chamados". */
  async ticketIdsOf(userId: string): Promise<number[]> {
    const rows = await runQuery(
      this.db
        .select({ ticketId: ticketWatchers.ticketId })
        .from(ticketWatchers)
        .where(eq(ticketWatchers.userId, userId)),
      'listar os chamados em que a pessoa está vinculada',
    );

    return rows.map((row) => row.ticketId);
  }

  /** Vincula quem ainda não está. Quem já está fica como está (com a data de quando entrou). */
  async add(ticketId: number, people: readonly WatcherToAdd[], createdBy: string): Promise<void> {
    if (people.length === 0) return;

    await runQuery(
      this.db
        .insert(ticketWatchers)
        .values(people.map((person) => ({ ticketId, ...person, createdBy })))
        .onConflictDoNothing(),
      'vincular pessoas ao chamado',
    );
  }

  /** Desvincula estas pessoas deste chamado. */
  async remove(ticketId: number, userIds: readonly string[]): Promise<void> {
    if (userIds.length === 0) return;

    await runQuery(
      this.db
        .delete(ticketWatchers)
        .where(and(eq(ticketWatchers.ticketId, ticketId), inArray(ticketWatchers.userId, [...userIds]))),
      'desvincular pessoas do chamado',
    );
  }
}
