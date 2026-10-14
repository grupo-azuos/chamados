import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_NOTICE_KINDS,
  type WhatsappNoticeFailure,
} from '@template/shared/schemas/whatsapp-notice.schema';
import { and, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { runMaybe, runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  whatsappMessages,
  type WhatsappMessageRow,
} from '../../../lib/db/schema/whatsapp-connections.schema';

export type WhatsappMessageRecord = {
  senderUserId: string;
  ticketId: number | null;
  kind: string;
  recipient: string;
};

/** Um aviso que entra na fila: o registro, o texto já escrito e até quando vale tentar. */
export type WhatsappQueuedMessage = WhatsappMessageRecord & { body: string; expiresAt: Date };

@Injectable()
export class WhatsappMessagesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Quantas mensagens SAÍRAM pelo número desta pessoa desde `since`. A fila não conta. */
  async countSince(senderUserId: string, since: Date): Promise<number> {
    const row = await runOne(
      this.db
        .select({ total: count() })
        .from(whatsappMessages)
        .where(
          and(
            eq(whatsappMessages.senderUserId, senderUserId),
            eq(whatsappMessages.status, 'sent'),
            gte(whatsappMessages.sentAt, since),
          ),
        ),
      'contar mensagens de WhatsApp',
    );

    return row.total;
  }

  /** Uma mensagem que o bot já entregou (a resposta da conversa): entra direto como enviada. */
  async record(message: WhatsappMessageRecord, now: Date = new Date()): Promise<void> {
    await runQuery(
      this.db.insert(whatsappMessages).values({ ...message, status: 'sent', sentAt: now }),
      'registrar mensagem de WhatsApp',
    );
  }

  async enqueue(message: WhatsappQueuedMessage, now: Date = new Date()): Promise<void> {
    await runQuery(
      this.db
        .insert(whatsappMessages)
        .values({ ...message, status: 'pending', nextAttemptAt: now }),
      'colocar mensagem de WhatsApp na fila',
    );
  }

  /**
   * Pega o que está na vez, no máximo UMA mensagem por número — é o que espaça os envios de
   * cada pessoa (ritmo de gente, não de robô). A linha pega já ganha a próxima tentativa
   * (`leaseUntil`) e conta a tentativa: se o servidor cair no meio do envio, ela volta
   * sozinha para a fila quando o prazo passa.
   *
   * O `UPDATE` confere de novo `pending` e o prazo: duas instâncias pegando ao mesmo tempo não
   * levam a mesma linha (o Postgres reavalia o `WHERE` na linha travada).
   */
  async claimDue(now: Date, leaseUntil: Date, batchSize: number): Promise<WhatsappMessageRow[]> {
    const isDue = and(
      eq(whatsappMessages.status, 'pending'),
      lte(whatsappMessages.nextAttemptAt, now),
    );
    const due = this.db
      .selectDistinctOn([whatsappMessages.senderUserId], { id: whatsappMessages.id })
      .from(whatsappMessages)
      .where(isDue)
      .orderBy(whatsappMessages.senderUserId, whatsappMessages.id)
      .limit(batchSize);

    return runQuery(
      this.db
        .update(whatsappMessages)
        .set({ nextAttemptAt: leaseUntil, attempts: sql`${whatsappMessages.attempts} + 1` })
        .where(and(inArray(whatsappMessages.id, due), isDue))
        .returning(),
      'pegar mensagens da fila de WhatsApp',
    );
  }

  /* Saiu: o texto é apagado — daqui em diante o rastro é só o tipo e para quem. */
  async markSent(id: number, now: Date = new Date()): Promise<void> {
    await this.update(id, {
      status: 'sent',
      sentAt: now,
      body: null,
      nextAttemptAt: null,
      failureReason: null,
    });
  }

  /** Volta para a fila, para outra tentativa em `nextAttemptAt`, guardando o motivo da falha. */
  async reschedule(
    id: number,
    nextAttemptAt: Date,
    reason: WhatsappNoticeFailure,
    expiresAt?: Date,
  ): Promise<void> {
    await this.update(id, {
      nextAttemptAt,
      failureReason: reason,
      ...(expiresAt && { expiresAt }),
    });
  }

  /** Para de tentar: `failed` (não deu) ou `discarded` (o sistema desistiu de propósito). */
  async stop(
    id: number,
    status: 'failed' | 'discarded',
    reason: WhatsappNoticeFailure,
  ): Promise<void> {
    await this.update(id, { status, failureReason: reason, nextAttemptAt: null });
  }

  /** Os avisos de um chamado, do mais novo para o mais antigo. */
  listForTicket(ticketId: number): Promise<WhatsappMessageRow[]> {
    return runQuery(
      this.db
        .select()
        .from(whatsappMessages)
        .where(
          and(
            eq(whatsappMessages.ticketId, ticketId),
            inArray(whatsappMessages.kind, [...WHATSAPP_NOTICE_KINDS]),
          ),
        )
        .orderBy(desc(whatsappMessages.createdAt), desc(whatsappMessages.id)),
      'listar avisos de WhatsApp do chamado',
    );
  }

  /**
   * Põe de volta na fila um aviso que parou — o "Reenviar" da ficha. Só o que parou e ainda
   * tem o texto: o que está na fila já vai sair, e o que saiu não sai duas vezes.
   */
  requeue(
    ticketId: number,
    id: number,
    now: Date,
    expiresAt: Date,
  ): Promise<WhatsappMessageRow | null> {
    return runMaybe(
      this.db
        .update(whatsappMessages)
        .set({ status: 'pending', attempts: 0, nextAttemptAt: now, expiresAt, failureReason: null })
        .where(
          and(
            eq(whatsappMessages.id, id),
            eq(whatsappMessages.ticketId, ticketId),
            inArray(whatsappMessages.status, ['failed', 'discarded']),
            sql`${whatsappMessages.body} is not null`,
          ),
        )
        .returning(),
      'reenviar aviso de WhatsApp',
    );
  }

  private async update(
    id: number,
    values: Partial<typeof whatsappMessages.$inferInsert>,
  ): Promise<void> {
    await runQuery(
      this.db.update(whatsappMessages).set(values).where(eq(whatsappMessages.id, id)),
      'atualizar mensagem de WhatsApp',
    );
  }
}
