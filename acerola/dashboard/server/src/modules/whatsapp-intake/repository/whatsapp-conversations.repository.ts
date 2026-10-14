import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  whatsappConversations,
  type WhatsappConversationInsert,
  type WhatsappConversationRow,
} from '../../../lib/db/schema/whatsapp-conversations.schema';

/** As conversas abertas do bot, guardadas no banco para sobreviver a um reinício. */
@Injectable()
export class WhatsappConversationsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  find(key: string): Promise<WhatsappConversationRow | null> {
    return runMaybe(
      this.db.select().from(whatsappConversations).where(eq(whatsappConversations.key, key)),
      'ler conversa do WhatsApp',
    );
  }

  /** Grava a conversa como está agora — cria a linha ou troca a que já existe. */
  async save(conversation: WhatsappConversationInsert, now: Date = new Date()): Promise<void> {
    const values = { ...conversation, updatedAt: now };

    await runQuery(
      this.db
        .insert(whatsappConversations)
        .values(values)
        .onConflictDoUpdate({ target: whatsappConversations.key, set: values }),
      'guardar conversa do WhatsApp',
    );
  }

  async remove(key: string): Promise<void> {
    await runQuery(
      this.db.delete(whatsappConversations).where(eq(whatsappConversations.key, key)),
      'apagar conversa do WhatsApp',
    );
  }
}
