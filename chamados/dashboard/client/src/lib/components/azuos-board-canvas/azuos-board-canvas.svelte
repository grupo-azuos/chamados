<!--
  @component
  O CANVAS DO PAINEL — a grade de 4 colunas onde os blocos se encaixam. Vendo, nada se mexe;
  montando, cada bloco arrasta pela alça, redimensiona pelos oito puxadores (cantos e meio de
  cada lado), e as casas vazias da grade aparecem atrás, como um tabuleiro. Um tipo de bloco
  arrastado da lateral cai na casa onde for solto. O mesmo desenho do paralegal.

  Quem decide onde cada bloco fica são as regras puras (`board-layout.util`); o canvas só mede
  o ponteiro e avisa a tela no fim do gesto.

  - `data`: os blocos, a posição de cada um, os resultados, os nomes dos filtros salvos e o
    "Período" do painel.
  - `state`: montando, `canDrop` (aceita um tipo arrastado da lateral) e `canEdit`.
  - `actions`: a posição nova no fim do gesto, editar, remover, trocar o gráfico, duplicar,
    abrir o item clicado e soltar um tipo numa casa.
-->
<script lang="ts" module>
  import {
    type LayoutItem,
    type Widget,
    WIDGET_KINDS,
    type WidgetWindow,
  } from '@template/shared/schemas/dashboard-board.schema';

  import { type WidgetState } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { type BoardItem } from '$lib/utils/widget-items.util';

  export type AzuosBoardCanvasProps = {
    data: {
      widgets: Widget[];
      layout: LayoutItem[];
      results: Record<string, WidgetState>;
      /** O nome do filtro salvo de cada bloco, pelo id do filtro. */
      filterNames: Record<string, string>;
      /** O "Período" escolhido no painel — nulo é "O de cada bloco". @default nenhum */
      boardPeriod?: WidgetWindow | null;
    };
    /** `canDrop`: aceita um tipo de bloco arrastado da lateral (montando, e com vaga). */
    /** `canEdit`: quem vê pode montar — o menu de cada bloco oferece editar, duplicar e remover. */
    state: { isEditing: boolean; canDrop?: boolean; canEdit?: boolean };
    actions: {
      onLayoutChange: (layout: LayoutItem[]) => void;
      onEditWidget: (id: string) => void;
      onRemoveWidget: (id: string) => void;
      onChangeKind?: (id: string, kind: Widget['kind']) => void;
      onDuplicateWidget?: (id: string) => void;
      /** Clicou num item de um bloco (barra, fatia, linha, card): abre a lista do que ele conta. */
      onOpenItem?: (widget: Widget, item: BoardItem) => void;
      /** Um tipo solto numa casa da grade: o bloco novo nasce ali, naquele tamanho. */
      onDropKind?: (kind: Widget['kind'], place: Omit<LayoutItem, 'i'>) => void;
    };
  };

  /** O formato do que a lateral arrasta: o tipo de bloco, no `dataTransfer`. */
  export const KIND_DRAG_TYPE = 'application/x-azuos-widget-kind';

  /**
   * O tipo de bloco escrito no NOME do formato. Durante o arrastar, o navegador não deixa ler o
   * conteúdo (`getData` volta vazio até soltar) — só a lista de formatos. Sem isto, a grade não
   * saberia o tamanho do bloco enquanto ele passa.
   */
  export function kindDragTypeOf(kind: Widget['kind']): string {
    return `${KIND_DRAG_TYPE}+${kind}`;
  }

  /**
   * O tipo de bloco que vem sendo arrastado da lateral — `null` para qualquer outra coisa (um
   * arquivo, um texto). Ao soltar, lê o conteúdo; passando por cima, lê o nome do formato.
   */
  export function kindOf(event: Pick<DragEvent, 'dataTransfer'>): Widget['kind'] | null {
    const transfer = event.dataTransfer;
    if (!transfer) return null;
    const fromData = transfer.getData(KIND_DRAG_TYPE);
    if (isKind(fromData)) return fromData;
    const prefix = `${KIND_DRAG_TYPE}+`;
    const fromType = Array.from(transfer.types ?? [])
      .find((type) => type.startsWith(prefix))
      ?.slice(prefix.length);

    return isKind(fromType) ? fromType : null;
  }

  function isKind(value: string | undefined): value is Widget['kind'] {
    return (WIDGET_KINDS as readonly string[]).includes(value ?? '');
  }

  /** A altura de uma casa da grade: dois andares cabem um gráfico inteiro. */
  export const BOARD_ROW_HEIGHT_PX = 140;
  const GAP = 16;
  /**
   * Montando, os blocos se afastam: o contorno tracejado fica 4px fora do bloco e os puxadores
   * 11px — com o vão de quem só vê, os puxadores de um bloco cairiam em cima do vizinho.
   */
  export const BOARD_EDITING_GAP_PX = 32;
  /**
   * E os ANDARES se afastam mais: acima de cada bloco flutua a barra de ferramentas dele (40px),
   * fora do conteúdo — o bloco aparece igual ao do painel, sem nada por cima.
   */
  export const BOARD_EDITING_ROW_GAP_PX = 80;
  /** O espaço acima do primeiro andar, montando: onde fica a barra dos blocos de cima. */
  export const BOARD_EDITING_TOP_PX = 72;
  /** Abaixo desta largura do canvas, vendo, os blocos se empilham numa coluna só. */
  const WIDE_CANVAS = 720;

  /**
   * Os blocos de ALTURA PRÓPRIA — o texto e os cards do destaque, dos números e do card com anel: a
   * casa cresce até caber o conteúdo, e o bloco nunca ganha rolagem por dentro. Os gráficos se
   * esticam na casa que tiverem, e a lista rola por dentro de propósito: esses ficam no tamanho dado.
   */
  const CONTENT_FIT_KINDS: readonly Widget['kind'][] = ['stats', 'hero', 'ringCard'];

  /**
   * A altura NATURAL do conteúdo: por um instante, a caixa perde a altura da casa (`auto`), e quem
   * estava esticado nela (`h-full`) volta ao tamanho do que tem dentro. Lido e desfeito antes da
   * pintura — ninguém vê. Medir a caixa esticada não servia: ela só diz a altura da casa, e o bloco
   * que cresceu numa tela estreita nunca mais encolhia.
   */
  export function naturalHeightOf(element: HTMLElement): number {
    const before = element.style.height;
    element.style.height = 'auto';
    const height = element.offsetHeight;
    element.style.height = before;

    return height;
  }
</script>

<script lang="ts">
  import gsap from 'gsap';
  import { untrack } from 'svelte';

  import BoardWidget, { DRAG_HANDLE, NO_DRAG } from '$lib/components/azuos-board-widget/azuos-board-widget.svelte';
  import { prefersReducedMotion } from '$lib/motion/motion';
  import {
    cellAt,
    defaultSizeOf,
    dropCellOf,
    fitLayout,
    isCompactKind,
    moveItem,
    pixelsOf,
    RESIZE_HANDLES,
    type ResizeHandle,
    resizeFromHandle,
    resizeItem,
    rowsOf,
    rowsToFit,
    slotRows,
  } from '$lib/utils/board-layout.util';
  import { cn } from '$lib/utils/cn';
  import { boardPeriodNote } from '@template/shared/schemas/dashboard-board.schema';

  let { data, state: canvasState, actions }: AzuosBoardCanvasProps = $props();

  const EMPTY_RESULT: WidgetState = { data: null, isLoading: true, error: null };
  const DROPPING_ID = '__dropping__';

  let width = $state(0);
  let container = $state<HTMLElement | null>(null);

  /**
   * O gesto em andamento: a grade como ela fica se a pessoa soltar agora (`layout`), e — movendo
   * — onde o bloco levantado está desenhado, seguindo a mão (`lifted`).
   */
  type Gesture = {
    id: string;
    layout: LayoutItem[];
    lifted: { left: number; top: number } | null;
    offset: { x: number; y: number };
    handle: ResizeHandle | null;
  };
  let gesture = $state<Gesture | null>(null);
  /** O tipo arrastado da lateral passando por cima: a grade com a casa provisória dele. */
  let dropping = $state<{ kind: Widget['kind']; layout: LayoutItem[] } | null>(null);

  const gap = $derived(canvasState.isEditing ? BOARD_EDITING_GAP_PX : GAP);
  const rowGap = $derived(canvasState.isEditing ? BOARD_EDITING_ROW_GAP_PX : GAP);
  const cell = $derived({ width: Math.max(1, (width - gap * 3) / 4), height: BOARD_ROW_HEIGHT_PX, gap, rowGap });
  const isStacked = $derived(!canvasState.isEditing && width > 0 && width < WIDE_CANVAS);
  /* Os andares que o conteúdo pede, por bloco de altura própria — medidos depois de cada desenho. */
  let contentRows = $state<Record<string, number>>({});
  /* A grade gravada, com a casa de quem não cabia crescida: é dela que todo gesto parte. */
  const base = $derived(fitLayout(data.layout, contentRows));
  const layout = $derived(dropping?.layout ?? gesture?.layout ?? base);
  const rows = $derived(canvasState.isEditing ? Math.max(slotRows(base), rowsOf(layout)) : rowsOf(layout));
  const height = $derived(Math.max(0, rows * (BOARD_ROW_HEIGHT_PX + rowGap) - rowGap));
  const placeholder = $derived(placeholderOf());
  /* Os blocos que já estavam quando o canvas abriu: só os outros pousam com animação. */
  const firstIds = untrack(() => data.widgets.map((widget) => widget.id));
  /* De cima para baixo e da esquerda para a direita: a ordem em que a coluna única empilha. */
  const ordered = $derived(
    [...data.widgets].sort((a, b) => {
      const one = placeOf(a.id);
      const other = placeOf(b.id);

      return one.y - other.y || one.x - other.x;
    }),
  );

  function placeOf(id: string): LayoutItem {
    return layout.find((item) => item.i === id) ?? { i: id, x: 0, y: rowsOf(layout), w: 2, h: 2 };
  }

  /** A sombra de onde o bloco vai cair: a casa do gesto, ou a do tipo vindo da lateral. */
  function placeholderOf(): LayoutItem | null {
    if (dropping) return dropping.layout.find((item) => item.i === DROPPING_ID) ?? null;
    if (!gesture) return null;

    return gesture.layout.find((item) => item.i === gesture?.id) ?? null;
  }

  function pointerIn(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = container?.getBoundingClientRect();

    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  /* ---------------------------------------------------------------- mover e redimensionar */

  function onPointerDown(event: PointerEvent) {
    if (!canvasState.isEditing || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>('[data-resize-handle]');
    const item = target.closest<HTMLElement>('[data-widget-id]');
    if (!item) return;
    const id = item.dataset.widgetId!;
    if (!handle && (!target.closest(`.${DRAG_HANDLE}`) || target.closest(`.${NO_DRAG}`))) return;
    event.preventDefault();
    const point = pointerIn(event);
    const rect = pixelsOf(placeOf(id), cell);
    gesture = {
      id,
      layout: base,
      lifted: handle ? null : { left: rect.left, top: rect.top },
      offset: { x: point.x - rect.left, y: point.y - rect.top },
      handle: (handle?.dataset.resizeHandle as ResizeHandle | undefined) ?? null,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }

  function onPointerMove(event: PointerEvent) {
    if (!gesture) return;
    const point = pointerIn(event);
    const widget = data.widgets.find((item) => item.id === gesture?.id);
    const start = base.find((item) => item.i === gesture?.id);
    if (!widget || !start) return;
    if (gesture.handle) {
      const next = resizeFromHandle(start, gesture.handle, cellAt(point, cell));
      const moved = moveItem(base, widget.id, next.x, next.y);
      /* O puxador não desce abaixo do conteúdo: o bloco não ganha rolagem por dentro. */
      const h = Math.max(next.h, contentRows[widget.id] ?? 1);
      gesture = { ...gesture, layout: resizeItem(moved, widget.id, next.w, h, isCompactKind(widget.kind)) };
      return;
    }
    const topLeft = { x: point.x - gesture.offset.x, y: point.y - gesture.offset.y };
    const target = dropCellOf(topLeft, cell, start.w);
    gesture = { ...gesture, lifted: { left: topLeft.x, top: topLeft.y }, layout: moveItem(base, widget.id, target.x, target.y) };
    followScroll(event);
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    if (!gesture) return;
    const next = gesture.layout;
    gesture = null;
    actions.onLayoutChange(next);
  }

  /** Arrastando perto da borda da janela, a página rola junto — o painel é mais alto que a tela. */
  function followScroll(event: PointerEvent) {
    const edge = 60;
    if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 12);
    if (event.clientY < edge) window.scrollBy(0, -12);
  }

  /* Sem mouse: as setas movem o bloco uma casa; com Shift, mudam o tamanho. */
  const STEPS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };

  function onKeyDown(event: KeyboardEvent) {
    const step = STEPS[event.key];
    const target = event.target as HTMLElement;
    const id = target.closest<HTMLElement>('[data-widget-id]')?.dataset.widgetId;
    const widget = data.widgets.find((item) => item.id === id);
    if (!step || !widget || !target.closest(`.${DRAG_HANDLE}`) || target.closest(`.${NO_DRAG}`)) return;
    event.preventDefault();
    const item = placeOf(widget.id);
    const h = Math.max(item.h + step[1], contentRows[widget.id] ?? 1);
    actions.onLayoutChange(
      event.shiftKey
        ? resizeItem(base, widget.id, item.w + step[0], h, isCompactKind(widget.kind))
        : moveItem(base, widget.id, item.x + step[0], item.y + step[1]),
    );
  }

  /* ---------------------------------------------------------------- soltar um tipo da lateral */

  function onDragOver(event: DragEvent) {
    const kind = canvasState.isEditing && canvasState.canDrop ? kindOf(event) : null;
    if (!kind) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    const size = defaultSizeOf(kind);
    const point = pointerIn(event);
    const target = cellAt(point, cell);
    const x = Math.min(target.x, 4 - size.w);
    const withSlot = [...base, { i: DROPPING_ID, x, y: target.y, ...size }];
    dropping = { kind, layout: moveItem(withSlot, DROPPING_ID, x, target.y) };
  }

  function onDragLeave(event: DragEvent) {
    if (container?.contains(event.relatedTarget as Node | null)) return;
    dropping = null;
  }

  function onDrop(event: DragEvent) {
    const kind = kindOf(event) ?? dropping?.kind;
    const slot = dropping?.layout.find((item) => item.i === DROPPING_ID);
    dropping = null;
    if (!kind || !slot) return;
    event.preventDefault();
    actions.onDropKind?.(kind, { x: slot.x, y: slot.y, w: slot.w, h: slot.h });
  }

  /**
   * OS ANDARES QUE O CONTEÚDO PEDE, por bloco de altura própria (`data-fit-id`). Mede depois de
   * cada desenho, antes da pintura, sempre que muda o que mexe na altura do conteúdo: a largura do
   * painel (tela, menu aberto), o vão entre os andares (vendo ou montando), a largura de cada bloco,
   * os blocos e os números que chegam. A altura natural não depende da altura da casa, então
   * crescer não pede outra medida — sem laço.
   */
  function measureContent() {
    if (!container) return;
    const cellNow = { height: BOARD_ROW_HEIGHT_PX, gap, rowGap };
    const next: Record<string, number> = {};
    for (const element of container.querySelectorAll<HTMLElement>('[data-fit-id]')) {
      const id = element.dataset.fitId;
      if (id) next[id] = rowsToFit(naturalHeightOf(element), cellNow);
    }
    if (!sameRows(contentRows, next)) contentRows = next;
  }

  function sameRows(a: Record<string, number>, b: Record<string, number>): boolean {
    const keys = Object.keys(a);

    return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
  }

  $effect(() => {
    /* O que muda a altura do conteúdo — lido aqui para o efeito rodar de novo quando mudar. */
    void [width, rowGap, isStacked, data.widgets, data.results, data.layout, data.boardPeriod];
    untrack(measureContent);
  });

  /* A casa muda de largura DESLIZANDO (a transição da grade, 200ms): a medida do desenho pega o
     começo dela. Quem vê a largura final é o observador de tamanho de cada caixa. */
  $effect(() => {
    const root = container;
    void [isStacked, data.widgets];
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measureContent());
    for (const element of root.querySelectorAll('[data-fit-id]')) observer.observe(element);

    return () => observer.disconnect();
  });

  /**
   * O POUSO: o bloco que acabou de entrar no painel (solto da lateral ou posto com um clique)
   * cresce a partir de 92% e acende — o olho acha onde ele caiu. Os blocos do primeiro desenho não
   * se mexem; quem pede menos movimento não vê animação.
   *
   * Só MONTANDO: trocar de aba (Equipe → Gestor) traz blocos de outro painel, que não "pousaram" —
   * aparecem. E no fim a animação limpa SÓ o que ela pôs (a escala e a opacidade): limpar tudo
   * (`clearProps: 'all'`) apagava junto a posição do bloco na grade, e ele caía no canto de cima,
   * por cima dos outros.
   */
  function landing(node: HTMLElement, isNew: boolean) {
    if (!isNew || prefersReducedMotion()) return;
    gsap.fromTo(
      node,
      { scale: 0.92, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)', clearProps: 'scale,opacity' },
    );
  }

  function styleOf(item: LayoutItem, lifted: { left: number; top: number } | null): string {
    const rect = pixelsOf(item, cell);
    const left = lifted?.left ?? rect.left;
    const top = lifted?.top ?? rect.top;

    return `left:${left}px;top:${top}px;width:${rect.width}px;height:${rect.height}px`;
  }
</script>

{#snippet widgetOf(widget: Widget)}
  <!-- A caixa que se mede (`measureContent`), nos blocos de altura própria. -->
  <div class="h-full" data-fit-id={CONTENT_FIT_KINDS.includes(widget.kind) ? widget.id : undefined}>
  <BoardWidget
    data={{
      widget,
      result: data.results[widget.id] ?? EMPTY_RESULT,
      filterName: widget.filterId ? (data.filterNames[widget.filterId] ?? null) : null,
      periodNote: boardPeriodNote(widget.source, data.boardPeriod ?? null),
    }}
    state={{ isEditing: canvasState.isEditing, canEdit: canvasState.canEdit }}
    actions={{
      onEdit: actions.onEditWidget,
      onRemove: actions.onRemoveWidget,
      onChangeKind: actions.onChangeKind,
      onDuplicate: actions.onDuplicateWidget,
      /* Montando, o clique é para arrumar o bloco, não para sair da tela. */
      onOpenItem: canvasState.isEditing ? undefined : actions.onOpenItem,
    }}
  />
  </div>
{/snippet}

{#if data.widgets.length === 0 && !canvasState.isEditing}
  <p class="rounded-surface bg-card text-ink-500 shadow-card p-8 text-center text-sm">
    Este painel ainda não tem blocos.
  </p>
{:else if isStacked}
  <!-- Estreito, vendo: um bloco embaixo do outro, na ordem da grade, cada um da altura dele. -->
  <div bind:this={container} bind:clientWidth={width} class="grid grid-cols-1 gap-4" data-testid="board-canvas">
    {#each ordered as widget (widget.id)}
      <div class="min-w-0" style:height={`${placeOf(widget.id).h * BOARD_ROW_HEIGHT_PX + (placeOf(widget.id).h - 1) * GAP}px`} data-widget-id={widget.id}>
        {@render widgetOf(widget)}
      </div>
    {/each}
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={container}
    bind:clientWidth={width}
    class="relative w-full"
    style:height={`${height}px`}
    style:margin-top={canvasState.isEditing ? `${BOARD_EDITING_TOP_PX}px` : undefined}
    data-testid="board-canvas"
    onpointerdown={onPointerDown}
    onkeydown={onKeyDown}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
  >
    {#if canvasState.isEditing}
      <!-- AS CASAS DA GRADE, atrás dos blocos: a pessoa vê onde um bloco pode cair. -->
      <div aria-hidden="true" data-testid="board-slots" class="pointer-events-none absolute inset-0">
        {#each { length: rows * 4 } as _, index (index)}
          <span
            class="rounded-surface border-border bg-mantle absolute border border-dashed"
            style={styleOf({ i: 'slot', x: index % 4, y: Math.floor(index / 4), w: 1, h: 1 }, null)}
          ></span>
        {/each}
      </div>
    {/if}

    {#if placeholder}
      <!-- A sombra de onde o bloco vai cair: a casa, arredondada, num azul da marca bem claro.
           Ela desliza entre as casas. -->
      <div
        aria-hidden="true"
        data-testid="board-placeholder"
        class="rounded-surface border-ink-500 bg-primary/20 pointer-events-none absolute border-2 border-dashed transition-all duration-200 ease-out"
        style={styleOf(placeholder, null)}
      ></div>
    {/if}

    {#each data.widgets as widget (widget.id)}
      {@const isLifted = gesture?.id === widget.id && gesture.lifted !== null}
      <div
        data-widget-id={widget.id}
        use:landing={canvasState.isEditing && !firstIds.includes(widget.id)}
        class={cn(
          'absolute',
          /* Os outros blocos abrem caminho deslizando, sem pular. */
          !isLifted && 'transition-[left,top,width,height] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          /* A SELEÇÃO DO PAINT: contorno tracejado grosso, afastado da borda, no neutro escuro
             (borda colorida é proibida no grupo); o hover escurece o daquele bloco. */
          canvasState.isEditing && 'outline-ink-500 hover:outline-ink-900 outline-2 outline-offset-4 outline-dashed',
          /* O bloco arrastado "levanta" e segue a mão: por cima, um pouco maior, inclinado. */
          isLifted && 'shadow-card z-20 scale-[1.03] rotate-1 cursor-grabbing',
        )}
        style={styleOf(placeOf(widget.id), isLifted ? (gesture?.lifted ?? null) : null)}
      >
        {@render widgetOf(widget)}
        {#if canvasState.isEditing}
          {#each RESIZE_HANDLES as handle (handle)}
            <button
              type="button"
              tabindex="-1"
              aria-label={`Redimensionar ${widget.title} pelo puxador ${handle}`}
              data-resize-handle={handle}
              class={cn(
                'rounded-chip ring-ink-900 bg-card absolute z-10 size-3.5 touch-none ring-2',
                handle === 'n' && '-top-[11px] left-[calc(50%-7px)] cursor-ns-resize',
                handle === 's' && '-bottom-[11px] left-[calc(50%-7px)] cursor-ns-resize',
                handle === 'e' && 'top-[calc(50%-7px)] -right-[11px] cursor-ew-resize',
                handle === 'w' && 'top-[calc(50%-7px)] -left-[11px] cursor-ew-resize',
                handle === 'ne' && '-top-[11px] -right-[11px] cursor-nesw-resize',
                handle === 'sw' && '-bottom-[11px] -left-[11px] cursor-nesw-resize',
                handle === 'nw' && '-top-[11px] -left-[11px] cursor-nwse-resize',
                handle === 'se' && '-right-[11px] -bottom-[11px] cursor-nwse-resize',
              )}
            ></button>
          {/each}
        {/if}
      </div>
    {/each}
  </div>
{/if}
