import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
