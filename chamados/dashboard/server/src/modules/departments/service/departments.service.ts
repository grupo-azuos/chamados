import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  type Department,
  type DepartmentOption,
  LOCAL_DEPARTMENTS,
  departmentNames,
} from '@template/shared/domain/department.util';
import { type DepartmentCatalogResponse } from '@template/shared/schemas/department.schema';

import { rememberDepartments } from '../../../lib/db/reference-names.util';
import { HrDepartmentsRepository } from '../repository/hr-departments.repository';

/** Quanto tempo a lista do RH vale sem perguntar de novo. */
export const HR_DEPARTMENTS_TTL_MS = 5 * 60 * 1000;

const NOT_OFFICIAL = 'Este departamento não está na lista do RH. Escolha um departamento da lista.';

const HR_UNAVAILABLE =
  'Não consegui ler a lista de departamentos do RH para conferir o departamento. Tente de novo em instantes.';

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
  private cached: { options: DepartmentOption[]; until: number } | null = null;

  constructor(
    private readonly repository: HrDepartmentsRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async catalog(): Promise<DepartmentCatalogResponse> {
    const rh = await this.hrOptions();

    return {
      rh: (rh ?? []).map((option) => option.name),
      rhOptions: rh ?? [],
      local: [...LOCAL_DEPARTMENTS],
      isRhAvailable: rh !== null,
    };
  }

  /** Os departamentos OFICIAIS com o id — ou `null` quando o RH nunca respondeu. */
  async officialOptions(): Promise<DepartmentOption[] | null> {
    return this.hrOptions();
  }

  /**
   * Confere que o id é de um departamento OFICIAL antes de gravar. Id fora da lista é 400 (a
   * pessoa escolhe outro); RH sem lista nenhuma é 503 — aceitar calado gravaria um id que
   * ninguém conferiu.
   */
  async assertOfficial(id: number): Promise<void> {
    const options = await this.hrOptions();
    if (!options) throw new ServiceUnavailableException(HR_UNAVAILABLE);
    if (!options.some((option) => option.id === id)) throw new BadRequestException(NOT_OFFICIAL);
  }

  /** Todos os nomes escolhíveis, na ordem do seletor — para quem só precisa comparar. */
  async names(): Promise<Department[]> {
    return departmentNames(await this.catalog());
  }

  /** A lista do RH, ou `null` quando ele não respondeu e nunca houve uma lida. */
  private async hrOptions(): Promise<DepartmentOption[] | null> {
    if (this.cached && this.cached.until > this.now()) return this.cached.options;

    try {
      const options = await this.repository.listOptions();
      this.cached = { options, until: this.now() + HR_DEPARTMENTS_TTL_MS };
      /* As consultas que agrupam pelo NOME no banco (painel, Inteligência) leem desta lista. */
      rememberDepartments(options);

      return options;
    } catch (error) {
      this.logger.warn(`Não consegui ler os departamentos do RH: ${String(error)}`);

      return this.cached?.options ?? null;
    }
  }
}
