import { z } from 'zod';

import {
  ROLE_CONTEXT_LABELS,
  ROLE_CONTEXTS,
  roleContextLabel,
  type RoleContext,
} from '../domain/role-context.util';

export { ROLE_CONTEXTS, ROLE_CONTEXT_LABELS, roleContextLabel, type RoleContext };

/**
 * Identidade — a FORMA de quem está usando o sistema.
 *
 * Quem autentica é o **Neon Auth**: a tela manda e-mail e senha direto para lá, recebe um
 * token assinado e o envia à API a cada requisição. A API confere a assinatura (JWKS) e lê o
 * cadastro em `neon_auth.user`, no mesmo banco. Este arquivo não é o cadastro — é só o que o
 * servidor precisa para decidir permissão e carimbar autoria.
 *
 * A consequência prática que mais importa: `createdBy` e `updatedBy` vêm de quem está na
 * requisição, e nunca do corpo.
 */

/**
 * Os três papéis do sistema, do menor para o maior.
 *
 * Eles moram na coluna `role` de `neon_auth.user` e são trocados no painel da Neon — o
 * sistema lê, nunca escreve. Papel desconhecido (ou vazio) cai em `user`, o mais restrito:
 * quem chega sem papel definido precisa receber MENOS acesso, nunca mais.
 */
export const userRoleSchema = z.enum(['user', 'manager', 'admin', 'superadmin']);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuário',
  manager: 'Gestor',
  admin: 'Administrador',
  superadmin: 'Super Admin',
};

export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/** O papel de quem chegou sem papel reconhecível: o mais restrito que existe. */
export const DEFAULT_USER_ROLE: UserRole = 'user';

/**
 * Os módulos do sistema — Infraestrutura, Sistema, Manutenção. A lista em si mora em
 * `domain/role-context.util.ts`.
 */
export const roleContextSchema = z.enum(ROLE_CONTEXTS);

/**
 * O que a pessoa pode em cada MÓDULO, só dos módulos que ela tem.
 *
 * MÓDULO AUSENTE É SEM ACESSO — não "acesso mínimo". Antes cada campo nascia `user` por padrão,
 * e isso dava leitura de todos os módulos a quem não tinha nenhum. Os valores possíveis são
 * dois (ver `domain/module-access.util.ts`): `admin` mexe em tudo daquele módulo, `user` só vê.
 */
export const contextRolesSchema = z.object({
  infra: userRoleSchema.optional(),
  sistema: userRoleSchema.optional(),
  manutencao: userRoleSchema.optional(),
});

export type ContextRoles = z.infer<typeof contextRolesSchema>;

/**
 * O papel da pessoa num módulo — ou `null`, quando ela não tem aquele módulo.
 *
 * O super-admin é a única exceção: ele tem todos, sem precisar de linha nenhuma. Não há
 * recaída para o papel geral, e é de propósito: ser Administrador no admin-console não abre
 * módulo nenhum — quem abre é o super-admin, na tela de Acessos.
 */
export function roleInContext(
  user: { role?: UserRole | null; roles?: Partial<ContextRoles> | null } | null | undefined,
  context: RoleContext,
): UserRole | null {
  if (!user) return null;
  if (user.role === 'superadmin') return 'superadmin';

  return user.roles?.[context] ?? null;
}

/**
 * Quem está usando o sistema agora.
 *
 * O `id` é o UUID da pessoa no admin-console (`x-forwarded-user-id`). O `role` é o papel que o
 * admin-console deu a ela neste sistema (ou `superadmin`), e `roles` traz o que ela pode em
 * cada módulo que tem.
 * `SessionUser` nunca carrega senha nem token — só o que a policy e a autoria precisam.
 */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  image: z.string().nullable().optional(),
  role: userRoleSchema,
  roles: contextRolesSchema.optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/**
 * Uma pessoa do diretório do admin-console — quem tem acesso a este sistema.
 * Usado em listagens de pessoas e seleção em formulários de atribuição de cargos.
 */
export const directoryUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  image: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  banned: z.boolean().nullable().optional(),
  createdAt: z.string().datetime().nullable().optional(),
});

export type DirectoryUser = z.infer<typeof directoryUserSchema>;
