<!--
  @component
  A tela do KANBAN DE SISTEMA: os chamados de software em quatro colunas por etapa. As colunas são
  a `AzuosKanbanColumn` e cada chamado é a superfície padrão (`AzuosCardSurface`), arrastável entre
  as colunas; clicar no card abre o chamado, e a etiqueta, o seletor de etapa e o link da issue
  ficam por cima dele. Use na rota do Kanban; ela não busca nada, só desenha o que o view-model
  entrega e avisa as ações.
-->
<script lang="ts" module>
  import {
    type KanbanColumn,
    type KanbanColumnId,
  } from '$lib/hooks/use-software-kanban/use-software-kanban.svelte';
  import StatusBadge, {
    type StatusBadgeTone,
  } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { type AzuosKanbanColumnTone } from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  export type AzuosSystemKanbanViewProps = {
    data: {
      columns: KanbanColumn[];
      projects: SoftwareProject[];
      selectedProjectId: number | null;
      totalTickets: number;
      cardColors: Record<number, string>;
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

  const PRIORITY_TONES: Record<string, StatusBadgeTone> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'neutral',
  };

  const PRIORITY_LABELS: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };

  const CARD_TONE_OPTIONS: { tone: StatusBadgeTone; label: string }[] = [
    { tone: 'brand', label: 'Destaque' },
    { tone: 'info', label: 'Info' },
    { tone: 'success', label: 'Aprovado' },
    { tone: 'warning', label: 'Atenção' },
    { tone: 'danger', label: 'Urgente' },
    { tone: 'neutral', label: 'Padrão' },
  ];

  /* A cor de cada etapa no cabeçalho da coluna: aberto é neutro, em atendimento é informação,
     esperando terceiros pede atenção e resolvido é sucesso. */
  const COLUMN_TONES: Record<KanbanColumnId, AzuosKanbanColumnTone> = {
    todo: 'neutral',
    in_progress: 'info',
    waiting: 'warning',
    done: 'success',
  };

</script>

<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Tag from '@lucide/svelte/icons/tag';

  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import StageColumn from '$lib/components/azuos-kanban-column/azuos-kanban-column.svelte';
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/azuos-popover/azuos-popover';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions }: AzuosSystemKanbanViewProps = $props();

  /* Estado de Drag and Drop */
  let draggedTicketId = $state<number | null>(null);
  let activeDropColumn = $state<KanbanColumnId | null>(null);
  let dragDepth = $state<Record<KanbanColumnId, number>>({
    todo: 0,
    in_progress: 0,
    waiting: 0,
    done: 0,
  });
  let justDragged = $state(false);

  /* Seletor de tom do card */
  let activeColorPickerTicketId = $state<number | null>(null);

  const projectOptions = $derived([
    { value: '', label: 'Todos os sistemas' },
    ...data.projects.map((p) => ({ value: String(p.id), label: p.name })),
  ]);

  function handleDragStart(e: DragEvent, ticketId: number) {
    draggedTicketId = ticketId;
    justDragged = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(ticketId));
    }
  }

  function handleDragEnd() {
    draggedTicketId = null;
    activeDropColumn = null;
    dragDepth = { todo: 0, in_progress: 0, waiting: 0, done: 0 };
    setTimeout(() => {
      justDragged = false;
    }, 150);
  }

  function handleDragEnter(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    dragDepth[colId] = (dragDepth[colId] || 0) + 1;
    activeDropColumn = colId;
  }

  function handleDragOver(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    activeDropColumn = colId;
  }

  function handleDragLeave(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    dragDepth[colId] = Math.max(0, (dragDepth[colId] || 1) - 1);
    if (dragDepth[colId] === 0 && activeDropColumn === colId) {
      activeDropColumn = null;
    }
  }

  function handleDrop(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    const rawId = e.dataTransfer?.getData('text/plain') ?? String(draggedTicketId);
    const id = Number(rawId);
    draggedTicketId = null;
    activeDropColumn = null;
    dragDepth = { todo: 0, in_progress: 0, waiting: 0, done: 0 };
    setTimeout(() => {
      justDragged = false;
    }, 150);

    if (id && !Number.isNaN(id)) {
      void actions.onMoveTicket(id, colId);
    }
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Kanban de Sistema',
      description:
        'Acompanhe e movimente chamados e entregas por estágio. Arraste os cards entre as colunas e rotule com selos para priorização.',
    }}
  >
    <div class="flex items-center gap-2">
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
    </div>
  </PageHeader>

  {#if viewState.moveError}
    <div
      class="flex items-center justify-between gap-3 rounded-box bg-destructive-soft p-3 text-xs text-destructive"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <span class="font-semibold">Aviso do Kanban:</span>
        <span>{viewState.moveError}</span>
      </div>
      {#if actions.onClearMoveError}
        <button
          type="button"
          class="rounded-chip px-2 py-0.5 text-xs font-semibold text-destructive hover:bg-muted"
          onclick={actions.onClearMoveError}
          title="Fechar aviso"
        >
          ✕
        </button>
      {/if}
    </div>
  {/if}

  {#if viewState.isLoading}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each [0, 1, 2, 3] as idx (idx)}
        <div class="h-96 animate-pulse rounded-surface bg-muted"></div>
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
    <!-- 4 Colunas do Kanban com Drag & Drop. A coluna é a padrão (`AzuosKanbanColumn`); o
         arrasto continua sendo da tela, num invólucro em volta dela, porque a tela precisa saber
         em qual coluna o card está para mostrar o "Solte aqui" e lembrar o card arrastado quando
         o navegador não manda os dados no soltar. -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each data.columns as column (column.id)}
        {@const isDropTarget = activeDropColumn === column.id}
        <div
          role="presentation"
          class="contents"
          ondragenter={(e) => handleDragEnter(e, column.id)}
          ondragover={(e) => handleDragOver(e, column.id)}
          ondragleave={(e) => handleDragLeave(e, column.id)}
          ondrop={(e) => handleDrop(e, column.id)}
        >
          <StageColumn
            data={{ title: column.title, count: column.tickets.length }}
            ui={{
              tone: COLUMN_TONES[column.id],
              className: cn('w-auto sm:w-auto', isDropTarget && 'bg-accent'),
            }}
          >
            {#if isDropTarget && draggedTicketId !== null}
              <div
                class="grid h-16 place-items-center rounded-box border-2 border-dashed border-border text-xs font-medium text-primary motion-safe:animate-pulse"
              >
                Solte aqui para mover para {column.title}
              </div>
            {/if}

            {#if column.tickets.length === 0 && !isDropTarget}
              <div
                class="grid h-28 place-items-center rounded-box border-2 border-dashed border-border text-xs text-muted-foreground"
              >
                Arraste um card para cá
              </div>
            {:else}
              {#each column.tickets as ticket (ticket.id)}
                {@const ticketTone =
                  (data.cardColors[ticket.id] as StatusBadgeTone | undefined) ?? 'neutral'}
                {@const isBeingDragged = draggedTicketId === ticket.id}

                <!-- Quem arrasta é este invólucro; o card em si é a superfície padrão, cujo botão
                     por cima do card inteiro abre o chamado (clique, Enter ou Espaço). -->
                <div
                  role="presentation"
                  draggable={!viewState.isMoving}
                  ondragstart={(e) => handleDragStart(e, ticket.id)}
                  ondragend={handleDragEnd}
                  class={isBeingDragged ? 'cursor-grabbing opacity-40' : 'cursor-grab active:cursor-grabbing'}
                >
                  <CardSurface
                    data={{ label: `${ticket.protocol} — ${ticket.description}` }}
                    ui={{ className: 'flex flex-col gap-2 p-3.5 text-left' }}
                    actions={{
                      onClick: () => {
                        /* O clique que o navegador dispara logo depois de soltar não abre o chamado. */
                        if (justDragged) return;
                        actions.onOpenTicket(ticket.id);
                      },
                    }}
                  >
                    <!-- Barra Superior: Drag handle, Protocolo, Selo do Card e Prioridade -->
                    <div class="flex items-center justify-between gap-1 text-xs">
                      <div class="flex items-center gap-1.5">
                        <span
                          class="text-muted-foreground opacity-60 transition-opacity group-hover/card:opacity-100"
                          title="Arraste para mover"
                        >
                          <GripVertical class="size-3.5" />
                        </span>
                        <span class="font-mono text-xs font-medium text-muted-foreground">
                          {ticket.protocol}
                        </span>
                      </div>

                      <!-- Os controles sobem acima do botão que cobre o card: sem isso o clique
                           neles abriria o chamado. -->
                      <div class="relative z-20 flex items-center gap-1.5">
                        <!-- Seletor de Selo/Tom do Card. O menu sai do card pelo portal do
                             popover: a superfície padrão corta o que passa da borda dela. -->
                        <Popover
                          bind:open={
                            () => activeColorPickerTicketId === ticket.id,
                            (isOpen) => (activeColorPickerTicketId = isOpen ? ticket.id : null)
                          }
                        >
                          <PopoverTrigger
                            class="grid size-6 place-items-center rounded-control border border-transparent bg-muted text-muted-foreground transition hover:text-foreground"
                            title="Atribuir etiqueta ao card"
                          >
                            <Tag class="size-3" />
                          </PopoverTrigger>
                          <PopoverContent
                            role="dialog"
                            aria-label="Etiqueta"
                            align="center"
                            class="flex w-36 flex-col gap-1 rounded-surface p-2 shadow-xl ring-foreground/8"
                          >
                            <span class="px-2 py-1 text-xs font-medium text-muted-foreground">
                              Etiqueta
                            </span>
                            {#each CARD_TONE_OPTIONS as opt (opt.tone)}
                              <button
                                type="button"
                                class="flex items-center justify-between rounded-chip px-2 py-1 text-xs text-foreground transition hover:bg-muted"
                                onclick={() => {
                                  actions.onSetCardColor(ticket.id, opt.tone);
                                  activeColorPickerTicketId = null;
                                }}
                              >
                                <span>{opt.label}</span>
                                <StatusBadge
                                  data={{ label: '' }}
                                  ui={{ tone: opt.tone, size: 'sm', className: 'size-2 p-0' }}
                                />
                              </button>
                            {/each}
                          </PopoverContent>
                        </Popover>

                        {#if ticketTone !== 'neutral'}
                          <StatusBadge
                            data={{
                              label: CARD_TONE_OPTIONS.find((o) => o.tone === ticketTone)?.label,
                            }}
                            ui={{ tone: ticketTone, size: 'sm' }}
                          />
                        {/if}

                        <StatusBadge
                          data={{ label: PRIORITY_LABELS[ticket.priority] ?? ticket.priority }}
                          ui={{ tone: PRIORITY_TONES[ticket.priority] ?? 'neutral', size: 'sm' }}
                        />
                      </div>
                    </div>

                    <!-- Descrição resumida -->
                    <p class="line-clamp-2 text-xs font-medium text-foreground leading-snug">
                      {ticket.description}
                    </p>

                    <div class="relative z-20" role="group" aria-label="Movimentação do chamado">
                      <SelectField
                        data={{
                          value: column.id,
                          options: data.columns
                            .filter((target) => target.id === column.id || target.id !== 'todo')
                            .map((target) => ({ value: target.id, label: target.title })),
                        }}
                        ui={{ ariaLabel: `Mover ${ticket.protocol} para` }}
                        state={{ isDisabled: viewState.isMoving }}
                        actions={{
                          onChange: (value) =>
                            void actions.onMoveTicket(ticket.id, value as KanbanColumnId),
                        }}
                      />
                    </div>
                    <!-- Tags: Sistema e GitHub Issue -->
                    <div
                      class="mt-1 flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-xs"
                    >
                      {#if ticket.projectName}
                        <StatusBadge
                          data={{ label: ticket.projectName }}
                          ui={{ tone: 'brand', size: 'sm' }}
                        />
                      {/if}

                      {#if ticket.githubIssueUrl && ticket.githubIssueNumber}
                        <a
                          href={ticket.githubIssueUrl}
                          target="_blank"
                          rel="noreferrer"
                          class="relative z-20 inline-flex items-center gap-0.5 rounded-chip bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          #{ticket.githubIssueNumber}
                          <ArrowUpRight class="size-3" />
                        </a>
                      {/if}

                      <span class="ml-auto text-xs text-muted-foreground">
                        {ticket.requesterName}
                      </span>
                    </div>
                  </CardSurface>
                </div>
              {/each}
            {/if}
          </StageColumn>
        </div>
      {/each}
    </div>
  {/if}
</div>
