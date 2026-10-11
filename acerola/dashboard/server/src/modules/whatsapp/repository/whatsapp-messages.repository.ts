import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte } from 'drizzle-orm';

import { runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { whatsappMessages } from '../../../lib/db/schema/whatsapp-connections.schema';

export type WhatsappMessageRecord = {
  senderUserId: string;
  ticketId: number | null;
  kind: string;
  recipient: string;
};

@Injectable()
export class WhatsappMessagesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Quantas mensagens saíram pelo número desta pessoa desde `since`. */
  async countSince(senderUserId: string, since: Date): Promise<number> {
    const row = await runOne(
      this.db
        .select({ total: count() })
        .from(whatsappMessages)
        .where(
          and(
            eq(whatsappMessages.senderUserId, senderUserId),
            gte(whatsappMessages.createdAt, since),
          ),
        ),
      'contar mensagens de WhatsApp',
    );

    return row.total;
  }

  async record(message: WhatsappMessageRecord): Promise<void> {
    await runQuery(
      this.db.insert(whatsappMessages).values(message),
      'registrar mensagem de WhatsApp',
    );
  }
}
