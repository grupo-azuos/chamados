import {
  COMPACT_WIDGET_KINDS,
  GRID_COLUMNS,
  type LayoutItem,
  MAX_GRID_ROWS,
  type WidgetKind,
} from '@template/shared/schemas/dashboard-board.schema';

/**
 * A GRADE DO PAINEL — 4 colunas, e as regras de pôr, mover e redimensionar um bloco nela.
 *
 * Funções puras: o canvas só chama, e quem decide onde cada bloco fica é daqui. A regra é a da
 * grade do paralegal: nada se sobrepõe (quem está no caminho desce), e tudo SOBE até encostar
 * (sem buraco em cima). Um bloco ocupa no mínimo duas casas, menos os compactos (o card com anel).
 */

/** O tamanho em que cada tipo nasce na grade. */
export function defaultSizeOf(kind: WidgetKind): { w: number; h: number } {
  if (kind === 'hero') return { w: 4, h: 2 };
  if (kind === 'stats') return { w: 4, h: 1 };
  if (kind === 'agenda') return { w: 4, h: 3 };
  if (kind === 'radial' || kind === 'list') return { w: 1, h: 2 };
  if (kind === 'ringCard') return { w: 1, h: 1 };

  return { w: 2, h: 2 };
}

/** Onde entra o bloco posto com um clique: embaixo de tudo, no tamanho do tipo. */
export function bottomPlace(layout: readonly LayoutItem[], kind: WidgetKind): Omit<LayoutItem, 'i'> {
  return { x: 0, y: rowsOf(layout), ...defaultSizeOf(kind) };
}

/** Quantas linhas a grade usa — a altura do canvas. */
export function rowsOf(layout: readonly Pick<LayoutItem, 'y' | 'h'>[]): number {
  return Math.max(0, ...layout.map((item) => item.y + item.h));
}

export function overlaps(one: LayoutItem, other: LayoutItem): boolean {
  return (
    one.i !== other.i &&
    one.x < other.x + other.w &&
    other.x < one.x + one.w &&
    one.y < other.y + other.h &&
    other.y < one.y + one.h
  );
}

/** O bloco dentro da grade: largura de 1 a 4, sem passar da borda, sem subir acima do topo. */
export function clampItem(item: LayoutItem): LayoutItem {
  const w = Math.min(Math.max(1, Math.round(item.w)), GRID_COLUMNS);
  const h = Math.min(Math.max(1, Math.round(item.h)), 8);
  const x = Math.min(Math.max(0, Math.round(item.x)), GRID_COLUMNS - w);
  const y = Math.min(Math.max(0, Math.round(item.y)), MAX_GRID_ROWS);

  return { ...item, x, y, w, h };
}

/**
 * TUDO SOBE ATÉ ENCOSTAR: de cima para baixo, cada bloco sobe enquanto a casa de cima está
 * livre. É o que impede buraco no meio do painel depois de mover ou tirar um bloco.
 */
export function compactLayout(layout: readonly LayoutItem[]): LayoutItem[] {
  const placed: LayoutItem[] = [];
  const order = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const item of order) {
    let current = { ...item };
    while (current.y > 0 && !placed.some((other) => overlaps({ ...current, y: current.y - 1 }, other))) {
      current = { ...current, y: current.y - 1 };
    }
    placed.push(current);
  }

  return layout.map((item) => placed.find((other) => other.i === item.i)!);
}

/** Quem está no caminho DESCE até não encostar mais em ninguém — em cascata. */
function pushDown(layout: LayoutItem[], fixed: LayoutItem): LayoutItem[] {
  const result = layout.map((item) => (item.i === fixed.i ? fixed : item));
  const queue = [fixed];

  while (queue.length > 0) queue.push(...pushAway(result, queue.shift()!));

  return result;
}

/** Quem encosta no bloco que se mexeu desce para baixo dele; devolve os que desceram. */
function pushAway(result: LayoutItem[], mover: LayoutItem): LayoutItem[] {
  const moved: LayoutItem[] = [];
  for (const [index, item] of result.entries()) {
    if (!overlaps(mover, item)) continue;
    const next = { ...item, y: mover.y + mover.h };
    result[index] = next;
    moved.push(next);
  }

  return moved;
}

/** O bloco vai para (x, y); quem está no caminho desce, e tudo sobe até encostar. */
export function moveItem(layout: readonly LayoutItem[], id: string, x: number, y: number): LayoutItem[] {
  const item = layout.find((candidate) => candidate.i === id);
  if (!item) return [...layout];
  const moved = clampItem({ ...item, x, y });

  return compactAround(pushDown([...layout], moved), moved);
}

/**
 * O bloco muda de tamanho — nunca abaixo de duas casas, a não ser o compacto (`isCompact`).
 * Quem fica embaixo desce, e tudo sobe até encostar.
 */
export function resizeItem(
  layout: readonly LayoutItem[],
  id: string,
  w: number,
  h: number,
  isCompact = false,
): LayoutItem[] {
  const item = layout.find((candidate) => candidate.i === id);
  if (!item) return [...layout];
  let resized = clampItem({ ...item, w, h });
  if (!isCompact && resized.w < 2 && resized.h < 2) resized = { ...resized, h: 2 };

  return compactAround(pushDown([...layout], resized), resized);
}

/**
 * Compacta mantendo o bloco que a pessoa está mexendo onde ela pôs: ele entra primeiro na
 * ordem, e os outros se arrumam em volta.
 */
function compactAround(layout: LayoutItem[], anchor: LayoutItem): LayoutItem[] {
  const others = compactLayout(layout.filter((item) => item.i !== anchor.i).concat(anchor));

  return layout.map((item) => others.find((other) => other.i === item.i)!);
}

/** O bloco cabe numa casa só? Só os compactos (o card com anel). */
export function isCompactKind(kind: WidgetKind): boolean {
  return COMPACT_WIDGET_KINDS.includes(kind);
}

/** A casa da grade sob um ponto, dado o tamanho de uma casa (e o espaço entre elas). */
export function cellAt(
  point: { x: number; y: number },
  cell: { width: number; height: number; gap: number },
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(point.x / (cell.width + cell.gap)))),
    y: Math.max(0, Math.floor(point.y / (cell.height + cell.gap))),
  };
}
