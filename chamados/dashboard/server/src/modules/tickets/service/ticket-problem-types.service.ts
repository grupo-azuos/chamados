import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  builtInProblemTypeByLabel,
  isTicketProblemType,
  isTicketProblemTypeForArea,
  type TicketArea,
  ticketAreaLabel,
  ticketProblemTypeOptionsForArea,
} from '@template/shared/domain/ticket-catalog.util';
import { type TicketProblemTypeOption } from '@template/shared/schemas/ticket.schema';

import { TicketProblemTypesRepository } from '../repository/ticket-problem-types.repository';

/**
 * Os TIPOS DE PROBLEMA de cada área: a lista fixa do domínio mais os cadastrados na hora.
 *
 * Cadastrar não é uma tela à parte: quem escolhe o tipo (abrindo o chamado ou atendendo) e não
 * acha o que procura digita o nome na busca do campo, e o tipo nasce ao salvar o chamado
 * (`resolve`). É o "pesquisar e, se não achar, cadastrar" do resto do sistema.
 */
@Injectable()
export class TicketProblemTypesService {
  constructor(private readonly repository: TicketProblemTypesRepository) {}

  /** As opções da área: a lista fixa, com os cadastrados antes do "Outro". */
  async options(area: TicketArea): Promise<TicketProblemTypeOption[]> {
    const builtIn = ticketProblemTypeOptionsForArea(area);
    const custom = (await this.repository.listByArea(area)).map((row) => ({
      value: row.name,
      label: row.name,
    }));
    const other = builtIn.filter((option) => option.value === 'other');
    const fixed = builtIn.filter((option) => option.value !== 'other');

    return [...fixed, ...custom, ...other];
  }

  /**
   * O valor que o chamado GRAVA para o tipo escolhido — e o cadastro dele, se for novo.
   *
   * - chave da lista fixa da área: fica como está;
   * - chave da lista fixa de OUTRA área: recusa ("ar-condicionado" não é de Infra);
   * - nome igual ao rótulo de um tipo fixo ("impressora"): vira a chave dele, sem duplicar;
   * - nome de um tipo já cadastrado: fica com a grafia do cadastro;
   * - nome novo: é cadastrado na área, com quem cadastrou.
   */
  async resolve(area: TicketArea, value: string, createdBy: string): Promise<string> {
    if (isTicketProblemType(value)) {
      if (isTicketProblemTypeForArea(area, value)) return value;

      throw new UnprocessableEntityException(
        `Este tipo de problema não é de ${ticketAreaLabel(area)}. Escolha um da lista da área.`,
      );
    }

    const name = value.trim();
    const builtIn = builtInProblemTypeByLabel(area, name);
    if (builtIn) return builtIn;

    const existing = await this.repository.findByName(area, name);
    if (existing) return existing.name;

    await this.repository.insert(area, name, createdBy);
    const created = await this.repository.findByName(area, name);

    return created?.name ?? name;
  }
}
