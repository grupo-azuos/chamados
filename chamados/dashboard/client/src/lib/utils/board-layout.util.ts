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
export function bottomPlace(
  layout: readonly LayoutItem[],
  kind: WidgetKind,
): Omit<LayoutItem, 'i'> {
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

/** O bloco mais alto que a grade aceita, em andares. A grade dos filtros usa menos. */
export const MAX_ROWS_PER_WIDGET = 8;

/** O bloco dentro da grade: largura de 1 a 4, sem passar da borda, sem subir acima do topo. */
export function clampItem(item: LayoutItem, maxH = MAX_ROWS_PER_WIDGET): LayoutItem {
  const w = Math.min(Math.max(1, Math.round(item.w)), GRID_COLUMNS);
  const h = Math.min(Math.max(1, Math.round(item.h)), maxH);
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
    while (
      current.y > 0 &&
      !placed.some((other) => overlaps({ ...current, y: current.y - 1 }, other))
    ) {
      current = { ...current, y: current.y - 1 };
    }
    placed.push(current);
  }

  return layout.map((item) => placed.find((other) => other.i === item.i)!);
}

/**
 * Quem está no caminho DESCE até não encostar mais em ninguém — em cascata.
 *
 * A fila guarda QUEM desceu (o id), e cada vez se lê a posição de AGORA dele. Antes ela guardava
 * cópias da posição de quando o bloco entrou: a cópia velha empurrava de novo quem já tinha
 * descido, a fila crescia sem parar e, com um painel de uns 14 blocos, arrastar rápido travava a
 * aba. O bloco que a pessoa está mexendo (`fixed`) nunca é empurrado — os outros se arrumam.
 */
function pushDown(layout: LayoutItem[], fixed: LayoutItem): LayoutItem[] {
  const result = layout.map((item) => (item.i === fixed.i ? fixed : item));
  const queue = [fixed.i];

  while (queue.length > 0) {
    const mover = result.find((item) => item.i === queue[0]);
    queue.shift();
    const moved = mover ? pushAway(result, mover, fixed.i) : [];
    queue.push(...moved.filter((id) => !queue.includes(id)));
  }

  return result;
}

/** Quem encosta no bloco que se mexeu desce para baixo dele (menos o fixo); devolve quem desceu. */
function pushAway(result: LayoutItem[], mover: LayoutItem, fixedId: string): string[] {
  const moved: string[] = [];
  for (const [index, item] of result.entries()) {
    if (item.i === fixedId || !overlaps(mover, item)) continue;
    result[index] = { ...item, y: mover.y + mover.h };
    moved.push(item.i);
  }

  return moved;
}

/** O bloco vai para (x, y); quem está no caminho desce, e tudo sobe até encostar. */
export function moveItem(
  layout: readonly LayoutItem[],
  id: string,
  x: number,
  y: number,
): LayoutItem[] {
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
  maxH = MAX_ROWS_PER_WIDGET,
): LayoutItem[] {
  const item = layout.find((candidate) => candidate.i === id);
  if (!item) return [...layout];
  let resized = clampItem({ ...item, w, h }, maxH);
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

/**
 * O tamanho de uma casa e o espaço entre elas. `rowGap`, quando há, é o espaço entre os ANDARES —
 * montando, maior que o das colunas, para a barra de ferramentas de cada bloco caber acima dele.
 */
export type GridCell = { width: number; height: number; gap: number; rowGap?: number };

const rowGapOf = (cell: GridCell): number => cell.rowGap ?? cell.gap;

/** A casa da grade sob um ponto, dado o tamanho de uma casa (e o espaço entre elas). */
export function cellAt(point: { x: number; y: number }, cell: GridCell): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(point.x / (cell.width + cell.gap)))),
    y: Math.max(0, Math.floor(point.y / (cell.height + rowGapOf(cell)))),
  };
}

/** Os oito puxadores do bloco montando: os quatro cantos e o meio de cada lado. */
export const RESIZE_HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;

export type ResizeHandle = (typeof RESIZE_HANDLES)[number];

/**
 * O bloco puxado por um dos oito puxadores até a casa `cell`: o lado puxado vai até ela, e o lado
 * oposto fica parado. Puxar o lado de cima mexe no `y` e na altura juntos; puxar a esquerda, no
 * `x` e na largura. Nunca menor que uma casa, nem virado do avesso.
 */
export function resizeFromHandle(
  item: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
  handle: ResizeHandle,
  cell: { x: number; y: number },
): Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'> {
  const right = item.x + item.w;
  const bottom = item.y + item.h;
  let { x, y, w, h } = item;
  if (handle.includes('e')) w = Math.max(1, cell.x - item.x + 1);
  if (handle.includes('s')) h = Math.max(1, cell.y - item.y + 1);
  if (handle.includes('w')) {
    x = Math.min(cell.x, right - 1);
    w = right - x;
  }
  if (handle.includes('n')) {
    y = Math.min(cell.y, bottom - 1);
    h = bottom - y;
  }

  return { x, y, w, h };
}

/**
 * A casa em que o bloco cai ao soltar: o canto de cima do bloco arrastado, arredondado para a casa
 * mais próxima — e não a casa sob o ponteiro, que fazia o bloco pular quando pego pelo meio.
 */
export function dropCellOf(
  topLeft: { x: number; y: number },
  cell: GridCell,
  w: number,
): { x: number; y: number } {
  const x = Math.round(topLeft.x / (cell.width + cell.gap));
  const y = Math.round(topLeft.y / (cell.height + rowGapOf(cell)));

  return { x: Math.max(0, Math.min(GRID_COLUMNS - w, x)), y: Math.max(0, y) };
}

/** O retângulo em pixels de um bloco na grade — onde o canvas o desenha. */
export function pixelsOf(
  item: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
  cell: GridCell,
): { left: number; top: number; width: number; height: number } {
  return {
    left: item.x * (cell.width + cell.gap),
    top: item.y * (cell.height + rowGapOf(cell)),
    width: item.w * cell.width + (item.w - 1) * cell.gap,
    height: item.h * cell.height + (item.h - 1) * rowGapOf(cell),
  };
}

/** Andares vazios abaixo do último bloco: espaço visível para onde arrastar o próximo. */
const SPARE_ROWS = 2;

/** Quantos andares de casas desenhar montando: até o fim do último bloco, mais dois livres. */
export function slotRows(layout: readonly Pick<LayoutItem, 'y' | 'h'>[]): number {
  return Math.max(4, rowsOf(layout)) + SPARE_ROWS;
}

/**
 * Quantos andares o conteúdo de um bloco pede: a altura dele, mais o vão entre os andares que ele
 * atravessa — de um andar até o teto de um bloco.
 */
export function rowsToFit(
  contentPx: number,
  cell: Pick<GridCell, 'height' | 'gap' | 'rowGap'>,
): number {
  const rowGap = rowGapOf({ width: 0, ...cell });
  const rows = Math.ceil((contentPx + rowGap) / (cell.height + rowGap));

  return Math.min(MAX_ROWS_PER_WIDGET, Math.max(1, rows));
}

/**
 * A grade que o canvas desenha: cada bloco no tamanho gravado, ou mais alto quando o conteúdo pede
 * (`fitted`, os andares medidos de cada bloco de altura própria) — quem fica embaixo desce. Nunca
 * encolhe o bloco que a pessoa fez maior. Vendo, nada se grava; montando, o gesto parte desta
 * grade, e o painel grava o que a pessoa vê.
 */
export function fitLayout(
  layout: readonly LayoutItem[],
  fitted: Readonly<Record<string, number>>,
): LayoutItem[] {
  let result = [...layout];
  for (const item of layout) {
    const fit = fitted[item.i] ?? 0;
    const current = result.find((candidate) => candidate.i === item.i);
    if (!current || fit <= current.h) continue;
    const grown = { ...current, h: fit };
    result = compactAround(pushDown(result, grown), grown);
  }

  return result;
}
