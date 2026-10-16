import { Inject, Injectable } from '@nestjs/common';
import { moduleRoleFor } from '@template/shared/domain/module-access.util';
import { ROLE_CONTEXTS, type RoleContext } from '@template/shared/domain/role-context.util';
import {
  sessionUserSchema,
  type ContextRoles,
  type SessionUser,
} from '@template/shared/schemas/user.schema';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { runQuery } from '../db/db-error.util';
import { DB } from '../db/db.token';
import { type Database } from '../db/db.type';
import { internalRoles } from '../db/schema/internal-roles.schema';
import { superAdmins } from '../db/schema/super-admins.schema';

/**
 * DE ONDE A IDENTIDADE VEM — e só daqui.
 *
 * Este sistema não faz login. Quem fica na frente dele (o Traefik do Coolify, com o
 * `forwardAuth` do admin-console) autentica a pessoa e injeta quem ela é em quatro cabeçalhos.
 * Duas etapas, nesta ordem:
 *
 *  1. **Os cabeçalhos dizem quem é** e qual papel o admin-console deu a ela neste sistema
 *     (Administrador · Gestor · Usuário).
 *  2. **O banco diz quais módulos ela tem** (`internal_roles`) e se ela é o super-admin
 *     (`super_admins`). A combinação das duas peças está em `domain/module-access.util.ts`.
 *
 * O sistema CONFIA nos cabeçalhos sem perguntar de onde vieram — é assim que auth-forward
 * funciona, em qualquer implementação. Por isso o container não pode ser alcançado sem passar
 * pelo proxy, e o router público (abrir chamado, validar documento) precisa APAGAR esses
 * cabeçalhos de quem chega de fora (ver README, "Autenticação").
 */
export const FORWARDED_IDENTITY_HEADERS = {
  id: 'x-forwarded-user-id',
  email: 'x-forwarded-user-email',
  name: 'x-forwarded-user-name',
  role: 'x-forwarded-user-role',
} as const;

/**
 * Os três papéis que o admin-console manda. `superadmin` NÃO está aqui de propósito: ele não
 * vem de cabeçalho nenhum, só do banco deste sistema. Um cabeçalho dizendo `superadmin` é
 * identidade inválida, e não promoção.
 */
const forwardedIdentitySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'manager', 'user']),
});

export type ForwardedIdentity = z.infer<typeof forwardedIdentitySchema>;

/**
 * A pessoa de desenvolvimento, quando não há proxy na frente (só com `USER_MOCK` ligado — ver
 * `env.schema.ts`, que recusa o mock em produção).
 *
 * Mesma forma de uma identidade encaminhada, com UUID de verdade no formato: um id que só
 * existe em desenvolvimento seria um dado que produção nunca produz. Ela é Administrador, mas
 * começa SEM módulo nenhum, como qualquer pessoa — para ver o painel inteiro, promova-a:
 * `npm run superadmin:promote -- dev@chamados.local`.
 */
export const MOCK_IDENTITY: ForwardedIdentity = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@chamados.local',
  name: 'Usuário de desenvolvimento',
  role: 'admin',
};

export type HeaderBag = Record<string, unknown>;

/**
 * Lê a identidade dos cabeçalhos encaminhados.
 *
 * Devolve `null` quando não há nada encaminhado — e TAMBÉM quando os cabeçalhos vieram e não
 * formam uma identidade válida. Quem chama separa os dois casos com `hasForwardedHeaders`:
 * cabeçalho pela metade é provedor mal configurado (ou alguém forjando), e completar o que
 * falta com qualquer outra coisa daria acesso a quem o provedor não soube identificar.
 */
export function readForwardedIdentity(headers: HeaderBag): ForwardedIdentity | null {
  const raw = {
    id: readHeader(headers, FORWARDED_IDENTITY_HEADERS.id),
    email: readHeader(headers, FORWARDED_IDENTITY_HEADERS.email),
    name: readHeader(headers, FORWARDED_IDENTITY_HEADERS.name),
    role: readHeader(headers, FORWARDED_IDENTITY_HEADERS.role),
  };

  if (Object.values(raw).every((value) => value === null)) return null;

  const parsed = forwardedIdentitySchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

/** O provedor TENTOU identificar alguém? Separa "não há proxy" de "o proxy mandou algo quebrado". */
export function hasForwardedHeaders(headers: HeaderBag): boolean {
  return Object.values(FORWARDED_IDENTITY_HEADERS).some(
    (header) => readHeader(headers, header) !== null,
  );
}

@Injectable()
export class IdentityProvider {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** A pessoa encaminhada vira a identidade completa: papel geral, módulos e super-admin. */
  async resolve(forwarded: ForwardedIdentity): Promise<SessionUser | null> {
    const [isSuper, modules] = await Promise.all([
      this.isSuperAdmin(forwarded),
      this.modulesOf(forwarded),
    ]);

    return toSessionUser(forwarded, isSuper, modules);
  }

  /**
   * É o super-admin? Reconhecido pelo UUID ou, enquanto o UUID ainda não foi gravado, pelo
   * e-mail que o comando de promoção recebeu. Na primeira vez, o UUID é gravado — a partir
   * daí, trocar de e-mail no admin-console não tira o poder de ninguém.
   */
  private async isSuperAdmin(forwarded: ForwardedIdentity): Promise<boolean> {
    const rows = await runQuery(
      this.db
        .select({ id: superAdmins.id, userId: superAdmins.userId })
        .from(superAdmins)
        .where(
          or(
            eq(superAdmins.userId, forwarded.id),
            sql`lower(${superAdmins.userEmail}) = ${forwarded.email.toLowerCase()}`,
          ),
        ),
      'conferir se a pessoa é super-admin',
    );

    const row = rows.find((candidate) => candidate.userId === forwarded.id) ?? rows[0];
    if (!row) return false;

    /* Linha de outra pessoa com o mesmo e-mail antigo não promove ninguém: só vale a linha
       sem UUID (ainda não reclamada) ou a do próprio UUID. */
    if (row.userId && row.userId !== forwarded.id) return false;
    if (!row.userId) await this.claimSuperAdmin(row.id, forwarded.id);

    return true;
  }

  private async claimSuperAdmin(rowId: number, userId: string): Promise<void> {
    await runQuery(
      this.db
        .update(superAdmins)
        .set({ userId })
        .where(and(eq(superAdmins.id, rowId), isNull(superAdmins.userId))),
      'gravar o UUID do super-admin',
    );
  }

  /**
   * Os módulos liberados para a pessoa — SÓ pelo UUID do admin-console, como no Paralegal.
   *
   * O e-mail não entra na conta: trocar de e-mail lá não pode tirar o acesso de ninguém, e um
   * e-mail antigo passado para outra pessoa não pode levar junto os módulos de quem o usava.
   * `user_email` fica na linha só para a tela de Acessos mostrar de quem ela é.
   */
  private async modulesOf(forwarded: ForwardedIdentity): Promise<RoleContext[]> {
    const rows = await runQuery(
      this.db
        .select({ context: internalRoles.context })
        .from(internalRoles)
        .where(eq(internalRoles.userId, forwarded.id)),
      'consultar os módulos da pessoa',
    );

    return ROLE_CONTEXTS.filter((context) => rows.some((row) => row.context === context));
  }
}

/**
 * As duas peças juntas (ver `domain/module-access.util.ts`).
 *
 * O papel geral só vale com algum módulo: sem módulo nenhum, a pessoa é `user`, seja o que for
 * no admin-console. Assim as poucas rotas que olham o papel geral (vincular WhatsApp, por
 * exemplo) não abrem nada para quem não tem módulo.
 */
function toSessionUser(
  forwarded: ForwardedIdentity,
  isSuper: boolean,
  modules: RoleContext[],
): SessionUser | null {
  const parsed = sessionUserSchema.safeParse({
    id: forwarded.id,
    email: forwarded.email,
    name: forwarded.name,
    image: null,
    role: primaryRole(forwarded, isSuper, modules),
    roles: contextRoles(forwarded, isSuper, modules),
  });

  return parsed.success ? parsed.data : null;
}

function primaryRole(
  forwarded: ForwardedIdentity,
  isSuper: boolean,
  modules: RoleContext[],
): SessionUser['role'] {
  if (isSuper) return 'superadmin';

  return modules.length > 0 ? forwarded.role : 'user';
}

function contextRoles(
  forwarded: ForwardedIdentity,
  isSuper: boolean,
  modules: RoleContext[],
): ContextRoles {
  const granted = isSuper ? ROLE_CONTEXTS : modules;
  const level = isSuper ? 'admin' : moduleRoleFor(forwarded.role);

  return Object.fromEntries(granted.map((context) => [context, level])) as ContextRoles;
}

function readHeader(headers: HeaderBag, name: string): string | null {
  const value = headers[name] ?? headers[name.toLowerCase()];
  // Cabeçalho repetido chega como lista; o primeiro é o que o provedor mandou primeiro.
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single !== 'string') return null;
  const trimmed = single.trim();

  return trimmed === '' ? null : trimmed;
}
