<!--
  @component
  A tela do KANBAN DE SISTEMA — o mesmo quadro das tarefas do paralegal: uma coluna por etapa
  (`AzuosKanbanColumn`, com o cabeçalho na cor e no ícone da etapa), que começa na esquerda e rola
  para o lado, e cada chamado no cartão do quadro (`AzuosSystemTicketCard`).

  O arrasto é do `@dnd-kit` (o mesmo do paralegal, no adaptador do Svelte), e não o nativo do
  navegador: o cartão inteiro acompanha o ponteiro (`DragOverlay`), o quadro rola sozinho quando o
  cartão chega perto da borda — para o lado e dentro da coluna —, funciona no toque e no teclado,
  e um clique no cartão continua sendo clique (o arrasto só começa depois de 6px). Soltar noutra
  coluna move o chamado de etapa. Clicar no cartão abre o chamado. "Expandir o quadro" abre o
  quadro na tela inteira, e o arrasto continua valendo.

  O quadro tem a altura da tela (`fullBleed`): cada coluna rola por dentro, e a barra de lado fica
  sempre à vista. Use na rota do Kanban; ela não busca nada, só desenha o que o view-model entrega
  e avisa as ações. O cartão sendo arrastado é estado de TELA, e por isso mora aqui.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Hourglass from '@lucide/svelte/icons/hourglass';
  import Wrench from '@lucide/svelte/icons/wrench';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import {
    type KanbanColumn,
    type KanbanColumnId,
  } from '$lib/hooks/use-software-kanban/use-software-kanban.svelte';
  import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export type AzuosSystemKanbanViewProps = {
    data: {
      columns: KanbanColumn[];
      projects: SoftwareProject[];
      selectedProjectId: number | null;
      totalTickets: number;
      cardColors: Record<number, string>;
      /** A foto de cada responsável, pelo id dele. Sem foto, o cartão mostra as iniciais. */
      assigneePhotos?: Record<string, string | null>;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isMoving?: boolean;
      error: string | null;
      moveError?: string | null;
    };
    actions: {
      onSelectProject: (projectId: number | null) => void;
      onRetry: () => void;
      onOpenTicket: (ticketId: number) => void;
      onMoveTicket: (ticketId: number, targetColumn: KanbanColumnId) => Promise<void>;
      onSetCardColor: (ticketId: number, color: string) => void;
      onClearMoveError?: () => void;
    };
  };

  /* A cor e o ícone de cada etapa, no cabeçalho da coluna e no ícone grande do cartão: aberto é
     neutro, em atendimento é informação, esperando pede atenção e concluído é sucesso. */
  const COLUMN_LOOKS: Record<KanbanColumnId, { tone: AzuosCardTone; icon: LucideIcon }> = {
    todo: { tone: 'neutral', icon: CircleDot },
    in_progress: { tone: 'info', icon: Wrench },
    waiting: { tone: 'warning', icon: Hourglass },
    done: { tone: 'success', icon: CircleCheck },
  };

  const COLUMN_DROP_PREFIX = 'column:';

  /** O id da coluna como área de soltar: com prefixo, para nunca se confundir com um chamado. */
  export function columnDropId(columnId: KanbanColumnId): string {
    return `${COLUMN_DROP_PREFIX}${columnId}`;
  }

  /**
   * O que o solto pede: mover o chamado para a etapa da coluna. Nada quando soltou fora de uma
   * coluna, ou na coluna em que ele já estava. Se a etapa não aceita (chamado iniciado não volta
   * para "A fazer"), quem diz é o view-model, com o aviso do quadro.
   */
  export function moveOfDrop(
    drop: { sourceId: unknown; targetId: unknown },
    columns: readonly KanbanColumn[],
  ): { ticketId: number; columnId: KanbanColumnId } | null {
    if (typeof drop.targetId !== 'string' || !drop.targetId.startsWith(COLUMN_DROP_PREFIX)) return null;
    const target = columns.find((column) => columnDropId(column.id) === drop.targetId);
    const ticketId = Number(drop.sourceId);
    const current = columns.find((column) => column.tickets.some((ticket) => ticket.id === ticketId));
    if (!target || !current || target.id === current.id) return null;

    return { ticketId, columnId: target.id };
  }
</script>

<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import {
    Accessibility,
    AutoScroller,
    Cursor,
    Feedback,
    PointerActivationConstraints,
    PreventSelection,
  } from '@dnd-kit/dom';
  import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from '@dnd-kit/svelte';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import AzuosExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import StageColumn from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import { fullBleed } from '$lib/hooks/use-full-bleed/use-full-bleed';
  import { cn } from '$lib/utils/cn';

  import DraggableCard from '../azuos-kanban-draggable-card/azuos-kanban-draggable-card.svelte';
  import TicketCard from '../azuos-system-ticket-card/azuos-system-ticket-card.svelte';

  let { data, state: viewState, actions }: AzuosSystemKanbanViewProps = $props();

  /* Qual cartão pediu a mudança: só ele mostra "Salvando…" enquanto o servidor responde. */
  let movingId = $state<number | null>(null);
  let isExpanded = $state(false);

  const projectOptions = $derived([
    { value: '', label: 'Todos os sistemas' },
    ...data.projects.map((p) => ({ value: String(p.id), label: p.name })),
  ]);

  /* Como no paralegal: o arrasto com o mouse só começa depois de 6px, e assim um clique no cartão
     continua abrindo o chamado. Começa de qualquer ponto do cartão — inclusive do botão que o
     cobre —, menos do menu de etiqueta e do link da issue (`data-no-drag`). */
  const sensors = [
    PointerSensor.configure({
      /* Um par novo a cada toque: a regra guarda o estado do arrasto que está medindo. */
      activationConstraints: () => [new PointerActivationConstraints.Distance({ value: 6 })],
      preventActivation: (event) =>
        event.target instanceof Element && event.target.closest('[data-no-drag]') !== null,
    }),
    KeyboardSensor,
  ];

  /** O pedaço do arrasto que os avisos e o soltar leem: quem foi pego e onde está. */
  type DragSnapshot = {
    canceled?: boolean;
    operation: { source: { id: unknown } | null; target: { id: unknown } | null };
  };

  /* O que o leitor de tela fala durante o arrasto, em português e pelo protocolo e pelo nome da
     etapa (o padrão da biblioteca fala em inglês, e pelo id). */
  const plugins = [
    Accessibility.configure({
      screenReaderInstructions: {
        draggable:
          'Para pegar o cartão, aperte Espaço. Com ele na mão, use as setas para levá-lo a outra coluna. Aperte Espaço de novo para soltar, ou Esc para desistir.',
      },
      announcements: {
        dragstart: ({ operation: { source } }: DragSnapshot) =>
          source ? `Cartão ${protocolOf(source.id)} pego.` : undefined,
        dragover: ({ operation: { target } }: DragSnapshot) =>
          target ? `Sobre a coluna ${columnTitleOf(target.id)}.` : 'Fora das colunas.',
        dragend: ({ operation: { source, target }, canceled }: DragSnapshot) => {
          if (!source) return undefined;
          if (canceled || !target) return `Cartão ${protocolOf(source.id)} devolvido.`;

          return `Cartão ${protocolOf(source.id)} solto em ${columnTitleOf(target.id)}.`;
        },
      },
    }),
    AutoScroller,
    Cursor,
    Feedback,
    PreventSelection,
  ];

  function ticketOf(id: unknown) {
    return data.columns.flatMap((column) => column.tickets).find((ticket) => ticket.id === Number(id));
  }

  function protocolOf(id: unknown): string {
    return ticketOf(id)?.protocol ?? String(id);
  }

  function columnTitleOf(dropId: unknown): string {
    return data.columns.find((column) => columnDropId(column.id) === dropId)?.title ?? String(dropId);
  }

  function lookOfTicket(id: unknown) {
    const column = data.columns.find((item) => item.tickets.some((ticket) => ticket.id === Number(id)));

    return COLUMN_LOOKS[column?.id ?? 'todo'];
  }

  function handleDragEnd(event: DragSnapshot) {
    if (event.canceled) return;
    const move = moveOfDrop(
      { sourceId: event.operation.source?.id, targetId: event.operation.target?.id },
      data.columns,
    );
    if (!move) return;
    movingId = move.ticketId;
    void actions.onMoveTicket(move.ticketId, move.columnId);
  }

  function labelOf(ticketId: number): StatusBadgeTone | null {
    return (data.cardColors[ticketId] as StatusBadgeTone | undefined) ?? null;
  }

  function photoOf(assigneeId: string | null | undefined): string | null {
    if (!assigneeId) return null;

    return data.assigneePhotos?.[assigneeId] ?? null;
  }

  /* Fora da tela cheia, o quadro vai até as bordas da área e até o pé da tela. Na tela cheia, a
     altura é a dela. */
  const fitToScreen = fullBleed(24, { isHeightFitted: true });
</script>

{#snippet board(isFull: boolean)}
  <DragDropProvider {sensors} {plugins} onDragEnd={handleDragEnd}>
    <!-- `justify-start` e largura cheia: o quadro nasce encostado à esquerda, e o que não cabe
         rola. -->
    <div
      {@attach (node) => (isFull ? undefined : fitToScreen(node))}
      class={cn('flex w-full items-start justify-start gap-4 overflow-x-auto pb-4', isFull && 'h-full')}
    >
      {#each data.columns as column (column.id)}
        {@const look = COLUMN_LOOKS[column.id]}
        <StageColumn
          data={{ title: column.title, count: column.tickets.length }}
          ui={{ tone: look.tone, icon: look.icon, dropId: columnDropId(column.id) }}
        >
          {#if column.tickets.length === 0}
            <p class="text-muted-foreground py-6 text-center text-xs">Arraste para cá.</p>
          {:else}
            {#each column.tickets as ticket (ticket.id)}
              <!-- Enquanto uma mudança está indo para o servidor, nada se arrasta. -->
              <DraggableCard
                data={{ id: ticket.id, label: `Mover o chamado ${ticket.protocol}` }}
                state={{ isDisabled: viewState.isMoving }}
              >
                <TicketCard
                  data={{ ticket, label: labelOf(ticket.id), assigneePhoto: photoOf(ticket.assigneeId) }}
                  ui={look}
                  state={{ isBusy: Boolean(viewState.isMoving) && movingId === ticket.id }}
                  actions={{ onOpen: actions.onOpenTicket, onSetLabel: actions.onSetCardColor }}
                />
              </DraggableCard>
            {/each}
          {/if}
        </StageColumn>
      {/each}
    </div>

    <!-- O cartão que acompanha o ponteiro: o próprio cartão, inteiro, e não a "foto" do navegador. -->
    <DragOverlay dropAnimation={null}>
      {#snippet children(source)}
        {@const dragged = ticketOf(source.id)}
        {#if dragged}
          <div class="rounded-surface w-72 cursor-grabbing shadow-xl sm:w-80">
            <TicketCard
              data={{ ticket: dragged, label: labelOf(dragged.id), assigneePhoto: photoOf(dragged.assigneeId) }}
              ui={lookOfTicket(dragged.id)}
            />
          </div>
        {/if}
      {/snippet}
    </DragOverlay>
  </DragDropProvider>
{/snippet}

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Kanban de Sistema',
      description:
        'Acompanhe e movimente chamados e entregas por estágio. Arraste os cards entre as colunas e rotule com selos para priorização.',
    }}
  >
    <div class="w-full min-w-0 sm:w-64">
      <OptionPicker
        data={{
          value: data.selectedProjectId ? String(data.selectedProjectId) : '',
          options: projectOptions,
        }}
        ui={{
          ariaLabel: 'Filtrar por sistema',
          placeholder: 'Todos os sistemas',
          fullWidth: true,
          mode: 'combobox',
          searchPlaceholder: 'Buscar sistema…',
        }}
        actions={{
          onChange: (val) => actions.onSelectProject(val ? Number(val) : null),
        }}
      />
    </div>
  </PageHeader>

  {#if viewState.moveError}
    <div
      class="rounded-box bg-destructive-soft text-destructive flex items-center justify-between gap-3 p-3 text-xs"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <span class="font-semibold">Aviso do Kanban:</span>
        <span>{viewState.moveError}</span>
      </div>
      {#if actions.onClearMoveError}
        <button
          type="button"
          class="rounded-chip text-destructive hover:bg-muted px-2 py-0.5 text-xs font-semibold"
          onclick={actions.onClearMoveError}
          title="Fechar aviso"
        >
          ✕
        </button>
      {/if}
    </div>
  {/if}

  {#if viewState.isLoading}
    <div class="flex w-full gap-4 overflow-hidden pb-4" aria-hidden="true">
      {#each [0, 1, 2, 3] as idx (idx)}
        <div class="rounded-surface bg-muted h-96 w-72 shrink-0 motion-safe:animate-pulse sm:w-80"></div>
      {/each}
    </div>
  {:else if viewState.error}
    <ErrorState
      data={{
        title: 'Não foi possível carregar o Kanban',
        message: viewState.error,
      }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum chamado no Kanban',
        description: 'Não há chamados de software registrados no momento.',
      }}
    />
  {:else}
    <section aria-label="Quadro dos chamados" class="flex flex-col gap-2">
      <!-- "Expandir", como no Dashboard e no quadro das tarefas do paralegal. -->
      <div class="flex justify-end">
        <AzuosActionButton
          data={{ label: 'Expandir o quadro' }}
          ui={{ variant: 'ghost', icon: Maximize2, isIconOnly: true }}
          actions={{ onClick: () => (isExpanded = true) }}
        />
      </div>
      {@render board(false)}
    </section>
    <AzuosExpandableScreen
      data={{
        title: 'Quadro dos chamados',
        description: 'Arraste os cards entre as colunas para mudar a etapa. Esc fecha.',
      }}
      state={{ isOpen: isExpanded }}
      actions={{ onClose: () => (isExpanded = false) }}
    >
      <div class="h-full p-6">
        {@render board(true)}
      </div>
    </AzuosExpandableScreen>
  {/if}
</div>
