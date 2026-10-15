import { ROLE_CONTEXTS, type RoleContext } from './role-context.util';

/**
 * A REGRA DE ACESSO DO SISTEMA, em duas peças que vêm de lugares diferentes:
 *
 *  - **o papel** (Administrador · Gestor · Usuário) vem do admin-console, no cabeçalho
 *    `x-forwarded-user-role` — é o que a pessoa é NESTE sistema;
 *  - **os módulos** (Infraestrutura · Sistema · Manutenção) são liberados aqui, pelo
 *    super-admin, na tela de Acessos.
 *
 * | Papel no admin-console | Com o módulo                 | Sem módulo nenhum                    |
 * |------------------------|------------------------------|--------------------------------------|
 * | Administrador          | mexe em tudo daquele módulo  | só abre chamado e valida documento   |
 * | Gestor                 | só vê os dados do módulo     | só abre chamado e valida documento   |
 * | Usuário                | só vê os dados do módulo     | só abre chamado e valida documento   |
 *
 * O super-admin (só por linha de comando) vê e altera tudo. Abrir chamado e validar documento
 * são públicos e não passam por regra nenhuma.
 *
 * Mora em `shared` porque a tela pergunta a mesma coisa para esconder o que não vai
 * funcionar — mas quem DECIDE é o servidor; a tela só evita o clique que daria 403.
 */

/** O papel que a pessoa ganha DENTRO de um módulo que tem: `admin` mexe, `user` só vê. */
export type ModuleRole = 'admin' | 'user';

/**
 * O papel no módulo, a partir do papel que o admin-console deu.
 *
 * Só Administrador escreve. Gestor e Usuário viram o mesmo nível — só consulta —, e qualquer
 * papel desconhecido também: na dúvida, o nível mais baixo.
 */
export function moduleRoleFor(globalRole: string | null | undefined): ModuleRole {
  return globalRole === 'admin' ? 'admin' : 'user';
}

type ModuleUser = {
  role?: string | null;
  roles?: Partial<Record<RoleContext, string>> | null;
};

/** A pessoa tem este módulo? O super-admin tem todos. */
export function hasModule(user: ModuleUser | null | undefined, context: RoleContext): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;

  return Boolean(user.roles?.[context]);
}

/** Pode alterar dados deste módulo? Só Administrador do módulo — ou o super-admin. */
export function canWriteModule(user: ModuleUser | null | undefined, context: RoleContext): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;

  return user.roles?.[context] === 'admin';
}

/** Os módulos que a pessoa tem, na ordem do menu. */
export function modulesOf(user: ModuleUser | null | undefined): RoleContext[] {
  return ROLE_CONTEXTS.filter((context) => hasModule(user, context));
}
