import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { type DepartmentOption, departmentIdFromName } from '@template/shared/domain/department.util';

import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { DepartmentsService } from '../../departments/service/departments.service';
import { ComputersRepository } from '../repository/computers.repository';
import { ComputersService } from './computers.service';

/** A linha que a migration 0025 escreveu na observação para o departamento sem par local. */
export const PREVIOUS_DEPARTMENT_MARKER = 'Departamento anterior: ';

/** O que fazer com UMA máquina: o id do RH e a observação sem a linha — ou nada. */
export type DepartmentAdoption = { departmentId: number; notes: string | null };

/**
 * O departamento antigo de uma máquina, casado com a lista do RH.
 *
 * Lê a PRIMEIRA linha "Departamento anterior: <nome>" da observação. Se o nome casa com UM
 * departamento oficial (sem acento, sem caixa, sem espaço sobrando, ou o código antigo), devolve
 * o id e a observação sem aquela linha. Sem par — ou com dois —, nulo: a linha fica para alguém
 * escolher o departamento à mão.
 */
export function adoptPreviousDepartment(
  notes: string | null,
  options: readonly DepartmentOption[],
): DepartmentAdoption | null {
  const lines = (notes ?? '').split('\n');
  const index = lines.findIndex((line) => line.trim().startsWith(PREVIOUS_DEPARTMENT_MARKER));
  if (index < 0) return null;

  const name = (lines[index] ?? '').trim().slice(PREVIOUS_DEPARTMENT_MARKER.length);
  const departmentId = departmentIdFromName(name, options);
  if (departmentId === null) return null;

  const rest = lines.filter((_, position) => position !== index).join('\n').trim();

  return { departmentId, notes: rest === '' ? null : rest };
}

/**
 * O FIM DA MIGRAÇÃO de nome para id, feito pelo próprio sistema ao subir.
 *
 * A migration 0025 não tinha como saber o id de um departamento do RH — a lista mora fora do
 * banco. Ela deixou o nome na observação, e aqui, com a lista do RH na mão, a máquina cujo nome
 * casa com UM departamento oficial ganha o `department_id` e perde a linha. É idempotente: a
 * máquina já com departamento não é tocada, e a sem par continua como está.
 *
 * Também lê o diretório e o RH logo de cara, para o painel já ter os nomes na primeira consulta
 * (`reference-names.util`).
 *
 * Nunca segura a subida nem derruba o sistema: roda em segundo plano, e o RH fora do ar só
 * adia o trabalho para a próxima subida. O responsável NÃO é preenchido aqui — por decisão, ele
 * é escolhido à mão, pessoa por pessoa.
 */
@Injectable()
export class ComputerReferenceBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ComputerReferenceBackfillService.name);

  constructor(
    private readonly repository: ComputersRepository,
    private readonly computers: ComputersService,
    private readonly departments: DepartmentsService,
  ) {}

  onApplicationBootstrap(): void {
    void this.run().catch((error: unknown) => {
      this.logger.warn(`Não consegui casar os departamentos antigos: ${String(error)}`);
    });
  }

  /** Devolve quantas máquinas ganharam o departamento — `null` quando o RH não respondeu. */
  async run(): Promise<number | null> {
    await this.computers.loadReferences();

    const options = await this.departments.officialOptions();
    if (!options) return null;

    const rows = await this.repository.listWithPreviousDepartment(PREVIOUS_DEPARTMENT_MARKER);
    let adopted = 0;
    for (const row of rows) {
      if (await this.adopt(row, options)) adopted += 1;
    }
    if (adopted > 0) this.logger.log(`${adopted} máquina(s) ganharam o departamento do RH.`);

    return adopted;
  }

  private async adopt(row: ComputerRow, options: readonly DepartmentOption[]): Promise<boolean> {
    const adoption = adoptPreviousDepartment(row.notes, options);
    if (!adoption) return false;

    await this.repository.update(row.id, adoption);

    return true;
  }
}
