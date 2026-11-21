import {
  type BoardDrill,
  DRILL_PARAM,
  drillParam,
} from '@template/shared/schemas/board-drill.schema';
import {
  type BoardFilterValues,
  type DataSourceKey,
  type Widget,
  widgetQueryOf,
} from '@template/shared/schemas/dashboard-board.schema';

import { contextPath } from '$lib/navigation/navigation';
import { type BoardItem } from '$lib/utils/widget-items.util';

/**
 * A TELA DE CADA FONTE — para onde o clique num item do painel leva. É a lista que mostra as
 * linhas da MESMA tabela que o bloco contou: só assim o recorte vira um filtro dela. Fonte sem
 * lista própria (nulo) deixa o bloco de leitura, sem mãozinha.
 */
export const DRILL_TARGETS: Record<DataSourceKey, string | null> = {
  infraTickets: contextPath('infra', '/tickets'),
  computers: contextPath('infra', '/computers'),
  maintenances: contextPath('infra', '/maintenance'),
  maintenanceSchedules: null,
  partMovements: null,
  computerAlerts: null,
  systemTickets: contextPath('sistema', '/tickets'),
  softwareProjects: contextPath('sistema', '/projects'),
  softwareActivity: null,
  scheduleEvents: null,
  maintenanceTickets: contextPath('manutencao', '/tickets'),
  inventoryItems: contextPath('manutencao', '/inventory'),
  inventoryMovements: null,
  quotes: contextPath('manutencao', '/quotes'),
};

/** A fonte tem uma lista para abrir? */
export function hasDrillTarget(source: DataSourceKey): boolean {
  return DRILL_TARGETS[source] !== null;
}

/**
 * O recorte de um clique: a pergunta inteira do bloco (com os filtros do painel que valem nele)
 * e o item clicado.
 */
export function drillOf(widget: Widget, values: BoardFilterValues, item: BoardItem): BoardDrill {
  return {
    ...widgetQueryOf(widget, values),
    key: item.key,
    key2: item.key2 ?? null,
    label: item.label ?? null,
    label2: item.label2 ?? null,
    title: widget.title,
  };
}

/** O endereço da lista com o recorte; nulo quando a fonte não tem lista. */
export function drillHref(drill: BoardDrill): string | null {
  const target = DRILL_TARGETS[drill.source];
  if (!target) return null;
  const params = new URLSearchParams({ [DRILL_PARAM]: drillParam(drill) });

  return `${target}?${params.toString()}`;
}
