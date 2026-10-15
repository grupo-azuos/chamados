import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AssignRoleInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { assertIsSuperAdmin } from '../../../lib/policy/policy-assert.util';
import { toInternalRole, toInternalRoleInsert } from '../mapper/roles.mapper';
import { RolesRepository } from '../repository/roles.repository';

/**
 * OS ACESSOS POR MÓDULO — quem é de Infraestrutura, de Sistema, de Manutenção.
 *
 * Tudo aqui é do SUPER-ADMIN: consultar, liberar e tirar. Liberar módulo é dar a alguém a
 * leitura (e, para Administrador, a escrita) de um pedaço inteiro do sistema — não é coisa
 * que Administrador de módulo dê a si mesmo. O super-admin, por sua vez, não sai daqui: só
 * existe pelo comando `npm run superadmin:promote`.
 *
 * As pessoas oferecidas vêm do admin-console: só quem tem acesso ao sistema lá.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly repository: RolesRepository,
    @Inject(USER_DIRECTORY_PROVIDER) private readonly userDirectory: UserDirectoryProvider,
  ) {}

  async list(actor: RequestUser): Promise<InternalRole[]> {
    assertIsSuperAdmin(actor.role, 'Consultar os acessos');

    const rows = await this.repository.list();
    return rows.map(toInternalRole);
  }

  async listUsers(actor: RequestUser): Promise<DirectoryUser[]> {
    assertIsSuperAdmin(actor.role, 'Consultar as pessoas');

    return this.userDirectory.listUsers();
  }

  async listByUser(actor: RequestUser, identifier: string): Promise<InternalRole[]> {
    assertIsSuperAdmin(actor.role, 'Consultar os acessos da pessoa');

    const rows = await this.repository.findByUserIdOrEmail(identifier.trim());
    return rows.map(toInternalRole);
  }

  async assign(actor: RequestUser, input: AssignRoleInput): Promise<InternalRole> {
    assertIsSuperAdmin(actor.role, 'Liberar módulo');

    const insert = toInternalRoleInsert(input, actor.email);
    const row = await this.repository.upsert(insert);

    return toInternalRole(row);
  }

  async delete(actor: RequestUser, id: number): Promise<void> {
    assertIsSuperAdmin(actor.role, 'Tirar módulo');

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Acesso não encontrado.');
    }

    await this.repository.delete(id);
  }
}
