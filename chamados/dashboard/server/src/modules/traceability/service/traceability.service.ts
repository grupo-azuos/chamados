import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { traceabilityGraph } from '@template/shared/domain/traceability-graph.util';
import {
  type TraceabilityGraph,
  type TraceabilityQuery,
} from '@template/shared/schemas/traceability.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { departmentNameOf, personOf, rememberPeople } from '../../../lib/db/reference-names.util';
import { getRoleInContext } from '../../../lib/policy/access.policy';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { DepartmentsService } from '../../departments/service/departments.service';
import { type FactsScope, TraceabilityRepository } from '../repository/traceability.repository';

export const NOTHING_TO_MAP = 'Nada para mostrar a partir daqui.';

/**
 * A RASTREABILIDADE da Infraestrutura: escolhe as máquinas pelo ponto de partida, lê os fatos e
 * monta o grafo (`traceabilityGraph`). Só lê — quem tem cargo em Infraestrutura vê.
 *
 * O quanto entra muda com o ponto de partida, para o mapa continuar legível:
 * - UMA MÁQUINA: tudo — todos os responsáveis (de antes e de agora), os chamados, as peças;
 * - UM DEPARTAMENTO: as máquinas dele, os responsáveis de agora e só os chamados abertos;
 * - UMA PESSOA: tudo o que ela já teve, e os chamados abertos dessas máquinas.
 */
@Injectable()
export class TraceabilityService {
  constructor(
    private readonly repository: TraceabilityRepository,
    @Optional() private readonly departments?: DepartmentsService,
    @Optional()
    @Inject(USER_DIRECTORY_PROVIDER)
    private readonly directory?: UserDirectoryProvider,
  ) {}

  async graph(user: RequestUser, query: TraceabilityQuery): Promise<TraceabilityGraph> {
    assertCanRead(getRoleInContext(user, 'infra'), 'a rastreabilidade');
    const scope = await this.scopeOf(query);
    if (!scope.computerIds.length && query.focus === 'computer')
      throw new NotFoundException(NOTHING_TO_MAP);
    await this.refreshNames();
    const facts = await this.repository.facts(scope);

    return traceabilityGraph(`${query.focus}:${query.id}`, {
      ...facts,
      departmentName: departmentNameOf,
      person: personOf,
    });
  }

  private async scopeOf(query: TraceabilityQuery): Promise<FactsScope> {
    if (query.focus === 'computer') {
      const id = Number(query.id);
      return {
        computerIds: Number.isInteger(id) && id > 0 ? [id] : [],
        responsibles: 'all',
        tickets: 'all',
        withParts: true,
      };
    }
    if (query.focus === 'department') {
      const id = Number(query.id);
      const computerIds = Number.isInteger(id)
        ? await this.repository.computerIdsOfDepartment(id)
        : [];
      return { computerIds, responsibles: 'current', tickets: 'open', withParts: false };
    }

    return {
      computerIds: await this.repository.computerIdsOfPerson(query.id),
      responsibles: { personId: query.id },
      tickets: 'open',
      withParts: false,
    };
  }

  /** Os nomes vêm do cache do sistema; uma leitura das listas o põe em dia. Falhar não para o mapa. */
  private async refreshNames(): Promise<void> {
    await Promise.allSettled([
      this.departments?.officialOptions(),
      this.directory?.listUsers().then((users) => rememberPeople(users)),
    ]);
  }
}
