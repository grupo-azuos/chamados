import { type DataSourceKey } from '@template/shared/schemas/dashboard-board.schema';
import { type BoardDrill } from '@template/shared/schemas/board-drill.schema';
import { type SQL } from 'drizzle-orm';

import { type RequestUser } from '../../lib/auth/request-user.type';

/**
 * O RECORTE DO PAINEL PARA AS LISTAS — o que as telas de destino de um clique num bloco
 * (chamados, máquinas, manutenções, sistemas, estoque…) pedem ao painel.
 *
 * É um token, e não a classe do service: o painel já lê as tabelas desses módulos, e eles
 * importando o service dele fechariam um ciclo de módulos. O token mora num arquivo sem
 * dependências, e o módulo do painel o oferece a todos (`@Global`).
 */
export const BOARD_DRILL = Symbol('BoardDrill');

export type BoardDrillResolver = {
  /**
   * A condição do recorte sobre a tabela da fonte — a MESMA que contou o bloco, mais o item
   * clicado. `expected`: as fontes que a lista de destino sabe filtrar (a tabela dela); outra
   * fonte é recusada com 422, em vez de virar uma condição sobre a tabela errada.
   */
  drillCondition(user: RequestUser, drill: BoardDrill, expected: readonly DataSourceKey[]): Promise<SQL>;
};
