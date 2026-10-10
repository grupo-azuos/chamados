import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * O número de WhatsApp que cada pessoa vinculou — o "metadado" do usuário.
 *
 * Aqui fica só o que o sistema precisa SABER: quem vinculou, qual número e desde quando. A
 * conexão em si (as chaves que deixam mandar mensagem pelo número) NÃO fica nesta tabela nem
 * neste banco: mora cifrada dentro do bot, que é o único que a usa.
 *
 * A identidade continua vindo do autenticador da instalação, e por isso `user_id` é texto sem
 * chave estrangeira — o mesmo desenho de `github_connections`.
 */
export const whatsappConnections = pgTable('whatsapp_connections', {
  userId: text('user_id').primaryKey(),
  /** Só dígitos, com DDI. */
  phone: text('phone').notNull(),
  linkedAt: timestamp('linked_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type WhatsappConnectionRow = typeof whatsappConnections.$inferSelect;

/**
 * Os textos do bot que o super admin trocou. Só entra aqui o que foi EDITADO: mensagem sem
 * linha usa o texto original, que mora no código (`whatsapp-template.util`, em shared).
 */
export const whatsappTemplates = pgTable('whatsapp_templates', {
  key: text('key').primaryKey(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
});

export type WhatsappTemplateRow = typeof whatsappTemplates.$inferSelect;

/**
 * O registro de cada mensagem automática que saiu pelo número de alguém.
 *
 * Serve a duas coisas: é a CONTAGEM do limite diário por pessoa (o que protege o número de um
 * bloqueio) e é o rastro de quem mandou o quê, por qual chamado. O texto da mensagem NÃO é
 * guardado — só o tipo e para quem.
 */
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: serial('id').primaryKey(),
    /** De quem é o número que enviou. */
    senderUserId: text('sender_user_id').notNull(),
    /** O chamado que gerou a mensagem, quando há um. */
    ticketId: integer('ticket_id'),
    /** O tipo: a chave do modelo (`ticket_ready`, `intake_form`…). */
    kind: text('kind').notNull(),
    recipient: text('recipient').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('whatsapp_messages_sender_created_idx').on(table.senderUserId, table.createdAt)],
);

export type WhatsappMessageRow = typeof whatsappMessages.$inferSelect;
