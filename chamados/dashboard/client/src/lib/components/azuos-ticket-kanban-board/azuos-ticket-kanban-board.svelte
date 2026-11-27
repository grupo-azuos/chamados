<!--
  @component
  O QUADRO DA FILA DE CHAMADOS — o modo kanban da fila, nas três áreas (Infraestrutura, Sistema e
  Manutenção), no formato do quadro de tarefas do paralegal: uma coluna por estágio do chamado —
  todos os do catálogo, na ordem em que o chamado anda (`AzuosKanbanColumn`, com o cabeçalho na cor
  do selo do estágio e no ícone dele) —, que começa na esquerda e rola para o lado, com a largura
  fixa de sempre, e cada chamado no cartão do quadro (`AzuosTicketKanbanCard`).

  O arrasto é do `@dnd-kit` (o mesmo do paralegal, no adaptador do Svelte), e não o nativo do
  navegador: o cartão inteiro acompanha o ponteiro (`DragOverlay`), o quadro rola sozinho quando o
  cartão chega perto da borda — para o lado e dentro da coluna —, funciona no toque e no teclado,
  e um clique no cartão continua sendo clique (o arrasto só começa depois de 6px). Soltar noutra
  coluna pede a mudança de etapa (`onMoveTicket`): o que ela significa — lançar na hora ou abrir o
  formulário de histórico — é do view-model. Clicar no cartão abre o chamado. "Expandir o quadro"
  abre o quadro na tela inteira, e o arrasto continua valendo.

  Mora DENTRO da fila (`AzuosTicketListView`), abaixo dos filtros: não tem cabeçalho, carregamento,
  erro nem vazio próprios — são os da fila, que busca com os mesmos filtros. O quadro vai de borda a
  borda da área e tem a altura da tela (`fullBleed`): cada coluna rola por dentro, e a barra de lado
  fica sempre à vista. O cartão de quem só consulta (`data.lockedTicketIds`) não se arrasta.

  Props: `data` traz as colunas, as etiquetas, as fotos e os chamados travados; `state` a mudança
  indo para o servidor e o aviso da última recusa; `actions` abrir, mover, etiquetar e fechar o
  aviso. O cartão sendo arrastado é estado de TELA, e por isso mora aqui.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import Headset from '@lucide/svelte/icons/headset';
  import Hourglass from '@lucide/svelte/icons/hourglass';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import {
    INITIAL_TICKET_STATUS,
    ticketStatusTone,
    type TicketStatus,
  } from '@template/shared/domain/ticket-status.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /** A coluna do quadro é o ESTÁGIO do chamado: uma coluna para cada um do catálogo. */
  export type TicketKanbanColumnId = TicketStatus;

  export type TicketKanbanColumn = {
    id: TicketKanbanColumnId;
    title: string;
    tickets: Ticket[];
  };

  export type AzuosTicketKanbanBoardProps = {
    data: {
      columns: TicketKanbanColumn[];
      cardColors: Record<number, string>;
      /** A foto de cada responsável, pelo id dele. Sem foto, o cartão mostra as iniciais. */
      assigneePhotos?: Record<string, string | null>;
      /** Os chamados que a pessoa só consulta: o cartão fica parado. */
      lockedTicketIds?: number[];
    };
    state?: {
      isMoving?: boolean;
      moveError?: string | null;
    };
    actions: {
      onOpenTicket: (ticketId: number) => void;
      onMoveTicket: (ticketId: number, targetColumn: TicketKanbanColumnId) => Promise<void>;
      onSetCardColor: (ticketId: number, color: string) => void;
      onClearMoveError?: () => void;
    };
  };

  /* O ícone de cada estágio, no cabeçalho da coluna e no ícone grande do cartão: os mesmos dos
     cartões de número da fila (Abertos, Em atendimento, Aguardando, Resolvidos) e o balão de
     conversa do retorno. A COR não é escolhida aqui: é a do selo do estágio (`ticketStatusTone`,
     do catálogo), para a coluna e o selo do cartão nunca discordarem. */
  const STAGE_ICONS: Record<TicketKanbanColumnId, LucideIcon> = {
    open: CircleAlert,
    requester_reply: MessageCircle,
    in_progress: Headset,
    waiting_requester: Hourglass,
    waiting_third_party: Hourglass,
    resolved: CircleCheck,
    resolved_with_caveats: CircleCheck,
    cancelled: CircleX,
  };

  /** A cor e o ícone do estágio: a cor do selo, o ícone dos cartões de número. */
  export function stageLookOf(status: TicketKanbanColumnId): { tone: AzuosCardTone; icon: LucideIcon } {
    return { tone: ticketStatusTone(status), icon: STAGE_ICONS[status] };
  }

  const COLUMN_DROP_PREFIX = 'column:';

  /** O id da coluna como área de soltar: com prefixo, para nunca se confundir com um chamado. */
  export function columnDropId(columnId: TicketKanbanColumnId): string {
    return `${COLUMN_DROP_PREFIX}${columnId}`;
  }

  /**
   * O que o solto pede: mover o chamado para a etapa da coluna. Nada quando soltou fora de uma
   * coluna, ou na coluna em que ele já estava. Se o estágio não aceita (chamado não volta para
   * "Aberto"), quem diz é o view-model, com o aviso do quadro.
   */
  export function moveOfDrop(
    drop: { sourceId: unknown; targetId: unknown },
    columns: readonly TicketKanbanColumn[],
  ): { ticketId: number; columnId: TicketKanbanColumnId } | null {
    if (typeof drop.targetId !== 'string' || !drop.targetId.startsWith(COLUMN_DROP_PREFIX)) return null;
    const target = columns.find((column) => columnDropId(column.id) === drop.targetId);
    const ticketId = Number(drop.sourceId);
    const current = columns.find((column) => column.tickets.some((ticket) => ticket.id === ticketId));
    if (!target || !current || target.id === current.id) return null;

    return { ticketId, columnId: target.id };
  }

  /** Todo cartão do quadro está travado — a pessoa só consulta esta fila. */
  export function isReadOnlyBoard(
    columns: readonly TicketKanbanColumn[],
    lockedTicketIds: readonly number[] = [],
  ): boolean {
    const ids = columns.flatMap((column) => column.tickets.map((ticket) => ticket.id));

    return ids.length > 0 && ids.every((id) => lockedTicketIds.includes(id));
  }
</script>

<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import X from '@lucide/svelte/icons/x';
  import {
    Accessibility,
    AutoScroller,
    Cursor,
    Feedback,
    PreventSelection,
  } from '@dnd-kit/dom';
  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import AzuosExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import DraggableCard, {
    KANBAN_CARD_SENSORS,
  } from '$lib/components/azuos-kanban-draggable-card/azuos-kanban-draggable-card.svelte';
  import StageColumn from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import TicketCard from '$lib/components/azuos-ticket-kanban-card/azuos-ticket-kanban-card.svelte';
  import { fullBleed } from '$lib/hooks/use-full-bleed/use-full-bleed';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions }: AzuosTicketKanbanBoardProps = $props();

  /* Qual cartão pediu a mudança: só ele mostra "Salvando…" enquanto o servidor responde. */
  let movingId = $state<number | null>(null);
  let isExpanded = $state(false);

  const isMoving = $derived(Boolean(viewState?.isMoving));
  const isReadOnly = $derived(isReadOnlyBoard(data.columns, data.lockedTicketIds));

  /* Os mesmos sensores dos cartões (ver `KANBAN_CARD_SENSORS`): o arrasto começa de qualquer
     ponto do cartão, depois de 6px, menos do que for `data-no-drag`; e pelo teclado. */
  const sensors = KANBAN_CARD_SENSORS;

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

  /** O desenho do cartão que acompanha o ponteiro: o da coluna de onde ele saiu, com o nome dela. */
  function lookOfTicket(id: unknown) {
    const column = data.columns.find((item) => item.tickets.some((ticket) => ticket.id === Number(id)));

    return { ...stageLookOf(column?.id ?? INITIAL_TICKET_STATUS), stageLabel: column?.title };
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

  function isLocked(ticketId: number): boolean {
    return data.lockedTicketIds?.includes(ticketId) ?? false;
  }

  /* Fora da tela cheia, o quadro vai até as bordas da área e tem a altura da área visível: ele
     mora abaixo dos números e dos filtros, e medido "até o pé da tela" sairia baixinho. Na tela
     cheia, a altura é a dela. */
  const fitToScreen = fullBleed(24, { isHeightFitted: true, isScreenTall: true });
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
        {@const look = stageLookOf(column.id)}
        <StageColumn
          data={{ title: column.title, count: column.tickets.length }}
          ui={{ tone: look.tone, icon: look.icon, dropId: columnDropId(column.id) }}
        >
          {#if column.tickets.length === 0}
            <p class="text-muted-foreground py-6 text-center text-xs">
              {isReadOnly ? 'Nada nesta etapa.' : 'Arraste para cá.'}
            </p>
          {:else}
            {#each column.tickets as ticket (ticket.id)}
              <!-- Enquanto uma mudança está indo para o servidor, nada se arrasta; o cartão de
                   quem só consulta nunca se arrasta. -->
              <DraggableCard
                data={{ id: ticket.id, label: `Mover o chamado ${ticket.protocol}` }}
                state={{ isDisabled: isMoving || isLocked(ticket.id) }}
              >
                <TicketCard
                  data={{ ticket, label: labelOf(ticket.id), assigneePhoto: photoOf(ticket.assigneeId) }}
                  ui={{ ...look, stageLabel: column.title }}
                  state={{ isBusy: isMoving && movingId === ticket.id }}
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

<section aria-label="Quadro dos chamados" class="flex flex-col gap-2">
  {#if viewState?.moveError}
    <!-- O aviso é o de falha da casa (inline); o "fechar" é um botão de ícone, não um ✕ à mão. -->
    <div class="flex items-center gap-2">
      <ErrorState data={{ message: viewState.moveError }} ui={{ variant: 'inline', className: 'flex-1' }} />
      {#if actions.onClearMoveError}
        <AzuosActionButton
          data={{ label: 'Fechar aviso' }}
          ui={{ variant: 'ghost', icon: X, isIconOnly: true }}
          actions={{ onClick: actions.onClearMoveError }}
        />
      {/if}
    </div>
  {/if}

  <!-- "Expandir", como no Dashboard e no quadro das tarefas do paralegal. -->
  <div class="flex items-center justify-between gap-3">
    <p class="text-muted-foreground text-xs">
      {isReadOnly
        ? 'Seu acesso a esta área é só de consulta: os cartões não se arrastam.'
        : 'Arraste o cartão para outra coluna para mudar a etapa.'}
    </p>
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
