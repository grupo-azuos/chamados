import { type WidgetData } from '@template/shared/schemas/dashboard-board.schema';

/**
 * O ITEM CLICADO NUM BLOCO, de volta à CHAVE do grupo. O gráfico devolve o que desenhou (o rótulo:
 * o nome da pessoa, "Em aberto"); o recorte precisa da chave que o servidor agrupou (o id da
 * pessoa, "open") — é ela que a lista compara.
 *
 * `key` nulo é "o bloco inteiro" (o card de número sem agrupar); `key2` é a coluna dos blocos de
 * par (empilhado, calor, fluxo, lado a lado).
 */
export type BoardItem = { key: string | null; label?: string; key2?: string; label2?: string };

type Series = WidgetData['series'];
type Cells = WidgetData['cells'];

/** O grupo de um rótulo. Rótulo que não está na série é a própria chave (o rótulo de texto). */
export function itemOfLabel(series: Series, label: string): BoardItem {
  const found = series.find((item) => item.label === label);

  return { key: found?.key ?? label, label };
}

/** O cruzamento de um rótulo de linha e, quando veio, um de coluna — os blocos de par. */
export function cellItemOf(cells: Cells, rowLabel: string, columnLabel?: string): BoardItem {
  const row = cells.find((cell) => cell.rowLabel === rowLabel);
  if (columnLabel === undefined) return { key: row?.row ?? rowLabel, label: rowLabel };
  const column = cells.find((cell) => cell.columnLabel === columnLabel);

  return {
    key: row?.row ?? rowLabel,
    label: rowLabel,
    key2: column?.column ?? columnLabel,
    label2: columnLabel,
  };
}

/**
 * Um nó do fluxo: `a:` é do agrupamento, `b:` da divisão (`toSankey`). O nó leva só a dimensão
 * dele; a outra fica aberta.
 */
export function sankeyItemOf(cells: Cells, nodeId: string): BoardItem | null {
  if (nodeId.startsWith('a:')) {
    const key = nodeId.slice(2);
    const label = cells.find((cell) => cell.row === key)?.rowLabel ?? key;

    return { key, label };
  }
  if (!nodeId.startsWith('b:')) return null;
  const key2 = nodeId.slice(2);
  const label2 = cells.find((cell) => cell.column === key2)?.columnLabel ?? key2;

  return { key: null, key2, label2 };
}

/** O card de número: agrupando, o grupo do card; sem agrupar, o bloco inteiro. */
export function statItemOf(isGrouped: boolean, series: Series, label: string): BoardItem {
  return isGrouped ? itemOfLabel(series, label) : { key: null };
}
