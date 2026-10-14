import { type AccessRequestDraft } from '@template/shared/domain/access-request.util';
import { index, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * As conversas do bot que estão NO MEIO — hoje, o pedido de acesso (`/acesso`), que pergunta
 * um dado por mensagem.
 *
 * Moravam na memória do servidor: um reinício (publicar uma versão nova, por exemplo) fazia a
 * pessoa perder o que já tinha respondido. Aqui elas sobrevivem, e vencem sozinhas em
 * `expires_at` — conversa vencida é lida como inexistente e apagada quando alguém passa por ela.
 *
 * A chave é a mesma que o bot usa: o número vinculado (hash do id, nunca o id) e a conversa.
 */
export const whatsappConversations = pgTable(
  'whatsapp_conversations',
  {
    /** `<sessionId>:<chatId>`. */
    key: text('key').primaryKey(),
    /** De quem é o número vinculado em que a conversa acontece. */
    userId: text('user_id').notNull(),
    attendantName: text('attendant_name').notNull(),
    /** Quem vira responsável pelo chamado no fim. Nulo: o pedido nasce sem responsável. */
    assigneeId: text('assignee_id'),
    /** O que a pessoa já respondeu. */
    draft: jsonb('draft').$type<AccessRequestDraft>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('whatsapp_conversations_expires_idx').on(table.expiresAt)],
);

export type WhatsappConversationRow = typeof whatsappConversations.$inferSelect;
export type WhatsappConversationInsert = typeof whatsappConversations.$inferInsert;

/**
 * A CAIXA DE ENTRADA: cada mensagem que o bot encaminhou, pelo identificador que o WhatsApp dá
 * a ela (padrão inbox, o irmão da fila de saída).
 *
 * O WhatsApp às vezes entrega a mesma mensagem de novo — numa reconexão, por exemplo. Sem este
 * registro, a mesma resposta seria lida duas vezes: a mesma pergunta pulada, ou o mesmo pedido
 * de acesso aberto em dobro. Só o identificador fica guardado, nunca o texto, e por 1 dia.
 */
export const whatsappInboundMessages = pgTable(
  'whatsapp_inbound_messages',
  {
    sessionId: text('session_id').notNull(),
    messageId: text('message_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.messageId] }),
    index('whatsapp_inbound_messages_received_idx').on(table.receivedAt),
  ],
);
