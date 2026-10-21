import { Inject, Injectable } from '@nestjs/common';
import type { ComputerResponsible } from '@template/shared/schemas/computer.schema';

import type { RequestUser } from '../../../lib/auth/request-user.type';
import type { UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { assertCanCreate } from '../../../lib/policy/policy-assert.util';

/** Responsabilidade pelo patrimônio independe de acesso ao Chamados; o diretório é o do escritório. */
@Injectable()
export class ComputerResponsiblesService {
  constructor(@Inject(USER_DIRECTORY_PROVIDER) private readonly directory: UserDirectoryProvider) {}

  async list(user: RequestUser): Promise<ComputerResponsible[]> {
    assertCanCreate(user.role, 'computadores');
    const people = await this.directory.listAllUsers();
    return people.filter((person) => !person.banned).map(({ id, name }) => ({ id, name }));
  }
}
