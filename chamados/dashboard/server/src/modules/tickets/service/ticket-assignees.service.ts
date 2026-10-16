import { Inject, Injectable } from '@nestjs/common';
import { TICKET_AREAS, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { type TicketAssigneeOption } from '@template/shared/schemas/ticket.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { withoutMockIdentity } from '../../../lib/auth/mock-identity.util';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';
import { RolesRepository } from '../../roles/repository/roles.repository';

const ADMIN_ROLE = 'admin';

/**
 * QUEM PODE SER O RESPONSÁVEL POR UM CHAMADO DE CADA ÁREA.
 *
 * Quem ATENDE aquela área: Administrador no admin-console com o módulo da área liberado, mais
 * os super-admins — que respondem pelas três. Admin de Infraestrutura não aparece num chamado
 * de Sistema, e Gestor da área também não: ele só consulta.
 *
 * O papel vem da lista do admin-console (quem tem acesso a este sistema); o módulo, de
 * `internal_roles`; o super-admin, de `super_admins` — a mesma combinação que a identidade de
 * quem está usando o sistema.
 */
@Injectable()
export class TicketAssigneesService {
  constructor(
    @Inject(USER_DIRECTORY_PROVIDER) private readonly directory: UserDirectoryProvider,
    private readonly roles: RolesRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** As pessoas que atendem `area`, em ordem alfabética. */
  async listForArea(area: TicketArea): Promise<TicketAssigneeOption[]> {
    const [users, grants] = await Promise.all([this.directory.listUsers(), this.loadGrants()]);

    return users
      .filter((user) => !user.banned && areasOf(user, grants).includes(area))
      .map((user) => ({ id: user.id, name: displayName(user) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  /** A pessoa, SE ela atende `area`. Nulo é "não pode ser responsável por este chamado". */
  async resolve(area: TicketArea, userId: string): Promise<TicketAssigneeOption | null> {
    return (await this.listForArea(area)).find((option) => option.id === userId) ?? null;
  }

  /** As áreas que esta pessoa atende — vazio para quem não administra nenhuma. */
  async areasOf(userId: string): Promise<{ name: string; areas: TicketArea[] } | null> {
    const user = await this.directory.getUserById(userId);
    if (!user || user.banned) return null;

    return { name: displayName(user), areas: areasOf(user, await this.loadGrants()) };
  }

  private async loadGrants(): Promise<Grants> {
    const [modules, superAdmins] = await Promise.all([
      this.roles.list(),
      this.roles.listSuperAdmins(),
    ]);

    /* A pessoa de desenvolvimento não atende ninguém onde ela não pode entrar. */
    return {
      modules: withoutMockIdentity(modules, this.env),
      superAdmins: withoutMockIdentity(superAdmins, this.env),
    };
  }
}

type Grants = {
  modules: readonly InternalRoleRow[];
  superAdmins: readonly { userId: string | null; userEmail: string }[];
};

function areasOf(user: DirectoryUser, grants: Grants): TicketArea[] {
  const email = user.email.toLowerCase();
  const isMine = (row: { userId: string | null; userEmail: string | null }) =>
    row.userId === user.id || (row.userEmail ?? '').toLowerCase() === email;

  if (grants.superAdmins.some(isMine)) return [...TICKET_AREAS];
  if (user.role !== ADMIN_ROLE) return [];

  const own = grants.modules.filter(isMine);

  return TICKET_AREAS.filter((area) => own.some((row) => row.context === area));
}

function displayName(user: DirectoryUser): string {
  return user.name.trim() || user.email;
}
