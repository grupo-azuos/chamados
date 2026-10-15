import { pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * O SUPER-ADMIN — quem vê e altera todas as telas, e o único que libera módulos.
 *
 * Ele não nasce de clique nenhum: só existe pelo comando `npm run superadmin:promote`, rodado
 * por quem tem o `.env` do servidor. Uma tela que promovesse super-admin seria o único
 * caminho para tomar o sistema inteiro — e ele ficaria ao alcance de qualquer sessão roubada.
 *
 * A pessoa é reconhecida pelo e-mail (é o que quem roda o comando sabe digitar); o `user_id`
 * do admin-console é gravado na primeira entrada dela, para trocar de e-mail não tirar o
 * poder de ninguém.
 */
export const superAdmins = pgTable(
  'super_admins',
  {
    id: serial('id').primaryKey(),
    userEmail: text('user_email').notNull(),
    userId: text('user_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('super_admins_user_email_idx').on(table.userEmail)],
);

export type SuperAdminRow = typeof superAdmins.$inferSelect;
