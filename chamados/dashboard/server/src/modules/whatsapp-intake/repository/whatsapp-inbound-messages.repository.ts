import { Inject, Injectable } from '@nestjs/common';
import { lt } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { whatsappInboundMessages } from '../../../lib/db/schema/whatsapp-conversations.schema';

/* O bot ignora mensagem com mais de 2 minutos: 1 dia de lembrança é folga de sobra. */
const REMEMBER_MS = 24 * 60 * 60 * 1000;

/** A caixa de entrada: lembra quais mensagens do WhatsApp já foram lidas. */
@Injectable()
export class WhatsappInboundMessagesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Marca a mensagem como lida. `true` na primeira vez; `false` quando ela já tinha chegado —
   * é a chave primária que decide, então duas entregas ao mesmo tempo não passam as duas.
   */
  async claim(sessionId: string, messageId: string, now: Date = new Date()): Promise<boolean> {
    const inserted = await runQuery(
      this.db
        .insert(whatsappInboundMessages)
        .values({ sessionId, messageId, receivedAt: now })
        .onConflictDoNothing()
        .returning({ messageId: whatsappInboundMessages.messageId }),
      'registrar mensagem recebida do WhatsApp',
    );

    /* A faxina vai junto: o volume é o de mensagens ao bot, e um índice cobre a busca. */
    await runQuery(
      this.db
        .delete(whatsappInboundMessages)
        .where(lt(whatsappInboundMessages.receivedAt, new Date(now.getTime() - REMEMBER_MS))),
      'limpar mensagens recebidas do WhatsApp',
    );

    return inserted.length > 0;
  }
}
