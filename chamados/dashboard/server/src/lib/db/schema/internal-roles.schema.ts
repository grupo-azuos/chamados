import { ROLE_CONTEXTS } from '@template/shared/schemas/user.schema';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * QUEM É DE QUAL MÓDULO — Infraestrutura, Sistema, Manutenção.
 *
 * Uma linha diz "esta pessoa tem acesso a este módulo". Só isso: o NÍVEL não mora aqui. Quem
 * diz se a pessoa é Administrador, Gestor ou Usuário é o admin-console, no cabeçalho
 * `x-forwarded-user-role`; a combinação das duas coisas está em `identity.provider.ts`:
 *
 *  - Administrador + módulo → mexe em tudo daquele módulo;
 *  - Gestor ou Usuário + módulo → só vê os dados do módulo;
 *  - sem linha nenhuma → só abre chamado e valida documento, que são públicos.
 *
 * Quem escreve aqui é o super-admin, na tela de Acessos. O nome da tabela ficou o antigo
 * (`internal_roles`, de quando ela guardava um cargo por módulo) porque renomear tabela pede
 * confirmação interativa no gerador de migration — e os acessos já liberados continuam
 * valendo sem migrar dado nenhum.
 *
 * `user_id` é o UUID do admin-console. `user_email` existe porque as linhas anteriores à
 * integração guardam o id do login antigo: a conferência casa por um OU pelo outro, e a
 * pessoa não perde o acesso por ter trocado de provedor de login.
 */
export const internalRoles = pgTable(
  'internal_roles',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    userEmail: text('user_email'),
    context: text('context', { enum: ROLE_CONTEXTS as unknown as [string, ...string[]] })
      .notNull()
      .default('sistema'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    uniqueIndex('internal_roles_user_context_idx').on(table.userId, table.context),
    index('internal_roles_user_id_idx').on(table.userId),
    index('internal_roles_user_email_idx').on(table.userEmail),
    index('internal_roles_context_idx').on(table.context),
    check(
      'internal_roles_context_valid',
      sql`${table.context} in (${sql.raw(ROLE_CONTEXTS.map((c) => `'${c}'`).join(', '))})`,
    ),
  ],
);

export type InternalRoleRow = typeof internalRoles.$inferSelect;
export type InternalRoleInsert = typeof internalRoles.$inferInsert;
