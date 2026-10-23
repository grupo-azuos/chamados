import { Injectable, Logger } from '@nestjs/common';
import {
  type Department,
  LOCAL_DEPARTMENTS,
  departmentNames,
} from '@template/shared/domain/department.util';
import { type DepartmentCatalogResponse } from '@template/shared/schemas/department.schema';

import { HrDepartmentsRepository } from '../repository/hr-departments.repository';

/** Quanto tempo a lista do RH vale sem perguntar de novo. */
export const HR_DEPARTMENTS_TTL_MS = 5 * 60 * 1000;

/**
 * Os departamentos que se podem escolher: os do RH e os que existem só aqui.
 *
 * Duas decisões:
 *
 *  - **Memória de cinco minutos.** O seletor aparece em todo cadastro e em todo chamado aberto;
 *    sem cache, cada um seria uma consulta ao RH. Departamento novo leva no máximo isso para
 *    aparecer.
 *  - **Falha não esvazia a lista.** Se o RH não responde, vale a última lista lida. Sem nenhuma,
 *    a resposta diz `isRhAvailable: false` e traz só os daqui: o formulário continua
 *    funcionando, e a tela explica por que a lista está curta.
 *
 * Sem policy de pessoa: quem abre chamado, mesmo sem módulo nenhum, precisa escolher o
 * departamento — e a lista não tem nada de sigiloso.
 */
@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);
  private cached: { names: string[]; until: number } | null = null;

  constructor(
    private readonly repository: HrDepartmentsRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async catalog(): Promise<DepartmentCatalogResponse> {
    const rh = await this.hrNames();

    return { rh: rh ?? [], local: [...LOCAL_DEPARTMENTS], isRhAvailable: rh !== null };
  }

  /** Todos os nomes escolhíveis, na ordem do seletor — para quem só precisa comparar. */
  async names(): Promise<Department[]> {
    return departmentNames(await this.catalog());
  }

  /** A lista do RH, ou `null` quando ele não respondeu e nunca houve uma lida. */
  private async hrNames(): Promise<string[] | null> {
    if (this.cached && this.cached.until > this.now()) return this.cached.names;

    try {
      const names = await this.repository.listNames();
      this.cached = { names, until: this.now() + HR_DEPARTMENTS_TTL_MS };

      return names;
    } catch (error) {
      this.logger.warn(`Não consegui ler os departamentos do RH: ${String(error)}`);

      return this.cached?.names ?? null;
    }
  }
}
