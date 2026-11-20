import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, isNull, notExists } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { archiveValues } from '../../../lib/db/archive.util';
import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import {
  type TicketWatcherRow,
  ticketWatchers,
} from '../../../lib/db/schema/ticket-watchers.schema';

/** A mesma tabela, de novo: para perguntar "esta pessoa já voltou ao chamado?". */
const activeWatchers = alias(ticketWatchers, 'active_ticket_watchers');

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
        .where(and(eq(ticketWatchers.ticketId, ticketId), isNull(ticketWatchers.archivedAt)))
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
        /* Desvinculada (arquivada), a pessoa deixa de ver o chamado na hora. */
        .where(and(eq(ticketWatchers.userId, userId), isNull(ticketWatchers.archivedAt))),
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

  /** Desvincula estas pessoas deste chamado: ARQUIVA as linhas, com quem desvinculou. */
  async remove(ticketId: number, userIds: readonly string[], actorId: string | null): Promise<void> {
    if (userIds.length === 0) return;

    await runQuery(
      this.db
        .update(ticketWatchers)
        .set(archiveValues(true, actorId))
        .where(
          and(
            eq(ticketWatchers.ticketId, ticketId),
            inArray(ticketWatchers.userId, [...userIds]),
            isNull(ticketWatchers.archivedAt),
          ),
        ),
      'desvincular pessoas do chamado',
    );
  }

  /** As pessoas desvinculadas que não voltaram por outro caminho — o bloco "Removidos". */
  async listArchived(ticketId: number): Promise<TicketWatcherRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketWatchers)
        .where(
          and(
            eq(ticketWatchers.ticketId, ticketId),
            isNotNull(ticketWatchers.archivedAt),
            notExists(
              this.db
                .select({ id: activeWatchers.id })
                .from(activeWatchers)
                .where(
                  and(
                    eq(activeWatchers.ticketId, ticketWatchers.ticketId),
                    eq(activeWatchers.userId, ticketWatchers.userId),
                    isNull(activeWatchers.archivedAt),
                  ),
                ),
            ),
          ),
        )
        .orderBy(desc(ticketWatchers.archivedAt)),
      'listar pessoas desvinculadas do chamado',
    );
  }

  async findInTicket(ticketId: number, id: number): Promise<TicketWatcherRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(ticketWatchers)
        .where(and(eq(ticketWatchers.ticketId, ticketId), eq(ticketWatchers.id, id)))
        .limit(1),
      'ler pessoa vinculada ao chamado',
    );
  }

  /** Vincula de novo quem foi desvinculado. Se a pessoa já voltou, o índice único recusa. */
  async restore(id: number): Promise<void> {
    await runQuery(
      this.db.update(ticketWatchers).set(archiveValues(false, null)).where(eq(ticketWatchers.id, id)),
      'vincular de novo a pessoa ao chamado',
    );
  }
}
