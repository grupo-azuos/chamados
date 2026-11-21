<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterKind,
    type BoardFilterValues,
    type BoardModule,
    type DashboardScope,
    type LayoutItem,
    type SavedFilter,
    type SaveFilterInput,
    type Widget,
    type WidgetKind,
  } from '@template/shared/schemas/dashboard-board.schema';

  import {
    type BoardEditing,
    type FilterCounts,
    type WidgetState,
  } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';

  /**
   * O PAINEL DE UM MÓDULO — as abas (Equipe, Gestor, Pessoal), os filtros, a grade dos blocos e
   * os editores. Quem não pode editar só vê e atualiza; quem pode clica em "Editar painel" e monta
   * num RASCUNHO, que só "Salvar painel" grava.
   *
   * Genérico de propósito: os três módulos usam este mesmo painel, cada um com os dados dele.
   */
  export type AzuosBoardViewProps = {
    data: {
      module: BoardModule;
      scope: DashboardScope;
      scopes: { value: DashboardScope; label: string }[];
      widgets: Widget[];
      layout: LayoutItem[];
      results: Record<string, WidgetState>;
      editing: BoardEditing | null;
      preview: WidgetState | null;
      updatedAt: string | null;
      boardFilters: BoardFilter[];
      filterValues: BoardFilterValues;
      filterCounts: Record<string, FilterCounts>;
      weight: number;
      savedFilters: SavedFilter[];
      archivedFilters: SavedFilter[];
      editingFilter: SavedFilter | 'new' | null;
    };
    state: {
      isLoading: boolean;
      isEditing: boolean;
      isSaving: boolean;
      isRefreshing: boolean;
      canEdit: boolean;
      canAdd: boolean;
      error: string | null;
      isFilterDialogOpen: boolean;
      isFilterSaving?: boolean;
      isFilterArchiving?: boolean;
      filterError?: string | null;
    };
    actions: {
      onScopeChange: (scope: string) => void;
      onRefresh: () => void;
      onStartEdit: () => void;
      onCancelEdit: () => void;
      onSave: () => void;
      onLayoutChange: (layout: LayoutItem[]) => void;
      onNewWidget: (kind?: WidgetKind) => void;
      onEditWidget: (id: string) => void;
      onCloseEditor: () => void;
      onSubmitWidget: (widget: Widget) => void;
      onRemoveWidget: (id: string) => void;
      onPreviewChange: (widget: Widget) => void;
      onFilterValueChange: (patch: Partial<BoardFilterValues>) => void;
      onClearFilterValues: () => void;
      onAddBoardFilter: (kind: BoardFilterKind) => void;
      onRemoveBoardFilter: (id: string) => void;
      onBoardFilterDisplayChange: (id: string, display: BoardFilterDisplay) => void;
      onOpenFilters: () => void;
      onCloseFilters: () => void;
      onNewFilter: () => void;
      onEditFilter: (filter: SavedFilter) => void;
      onCancelEditFilter: () => void;
      onSaveFilter: (id: string | null, body: SaveFilterInput) => void;
      onArchiveFilter: (id: string) => void;
      onRestoreFilter: (id: string) => void;
    };
  };

  /** "Montado em 20/11/2026" — ou o padrão do módulo, enquanto ninguém salvou. */
  export function updatedLabel(updatedAt: string | null): string {
    if (!updatedAt) return 'O painel padrão do módulo — monte o seu em "Editar painel".';
    const day = new Date(updatedAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return `Montado em ${day}. Os números se renovam sozinhos a cada 5 minutos.`;
  }
</script>

<script lang="ts">
  import Filter from '@lucide/svelte/icons/filter';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import {
    BOARD_PERIOD_NOTES,
    boardPeriodNote,
    MAX_BOARD_WEIGHT,
    sourcesOf,
  } from '@template/shared/schemas/dashboard-board.schema';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BoardCanvas from '$lib/components/azuos-board-canvas/azuos-board-canvas.svelte';
  import BoardFilterBar from '$lib/components/azuos-board-filter-bar/azuos-board-filter-bar.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterBuilderDialog from '$lib/components/azuos-filter-builder-dialog/azuos-filter-builder-dialog.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import WidgetEditorDialog from '$lib/components/azuos-widget-editor-dialog/azuos-widget-editor-dialog.svelte';

  let { data, state: viewState, actions }: AzuosBoardViewProps = $props();

  const filterNames = $derived(Object.fromEntries(data.savedFilters.map((filter) => [filter.id, filter.name])));
  const periodNotes = $derived(
    Object.fromEntries(
      sourcesOf(data.module)
        .filter((source) => BOARD_PERIOD_NOTES[source])
        .map((source) => [source, boardPeriodNote(source, data.filterValues.period)]),
    ),
  );
</script>

<div class="flex w-full flex-col gap-5">
  <PageHeader data={{ title: 'Painel', description: updatedLabel(data.updatedAt) }} ui={{ icon: LayoutDashboard }}>
    <ActionButton
      data={{ label: 'Atualizar', loadingLabel: 'Atualizando…' }}
      ui={{ variant: 'secondary', icon: RefreshCw }}
      state={{ isLoading: viewState.isRefreshing }}
      actions={{ onClick: actions.onRefresh }}
    />
    {#if viewState.canEdit && !viewState.isEditing}
      <ActionButton data={{ label: 'Editar painel' }} ui={{ icon: Pencil }} actions={{ onClick: actions.onStartEdit }} />
    {/if}
  </PageHeader>

  <div class="flex flex-wrap items-center justify-between gap-3">
    {#if data.scopes.length > 1}
      <SegmentedControl
        data={{ value: data.scope, options: data.scopes }}
        ui={{ ariaLabel: 'Qual painel', className: 'w-fit' }}
        state={{ isDisabled: viewState.isEditing }}
        actions={{ onChange: actions.onScopeChange }}
      />
    {/if}
    {#if viewState.isEditing}
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-ink-500 text-sm" aria-live="polite">{data.weight} de {MAX_BOARD_WEIGHT} pontos</span>
        <ActionButton data={{ label: 'Filtros salvos' }} ui={{ variant: 'secondary', icon: Filter }} actions={{ onClick: actions.onOpenFilters }} />
        <ActionButton
          data={{ label: 'Novo bloco' }}
          ui={{ variant: 'secondary', icon: Plus }}
          state={{ isDisabled: !viewState.canAdd }}
          actions={{ onClick: () => actions.onNewWidget() }}
        />
        <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'ghost' }} actions={{ onClick: actions.onCancelEdit }} />
        <ActionButton
          data={{ label: 'Salvar painel', loadingLabel: 'Salvando…' }}
          state={{ isLoading: viewState.isSaving }}
          actions={{ onClick: actions.onSave }}
        />
      </div>
    {/if}
  </div>

  {#if viewState.error}
    <ErrorState data={{ message: viewState.error }} ui={{ variant: 'inline' }} />
  {/if}

  {#if viewState.isLoading}
    <LoadingState data={{ label: 'Carregando o painel…' }} />
  {:else}
    <BoardFilterBar
      data={{ filters: data.boardFilters, values: data.filterValues, counts: data.filterCounts }}
      state={{ isEditing: viewState.isEditing }}
      actions={{
        onChange: actions.onFilterValueChange,
        onClear: actions.onClearFilterValues,
        onAdd: actions.onAddBoardFilter,
        onRemove: actions.onRemoveBoardFilter,
        onDisplayChange: actions.onBoardFilterDisplayChange,
      }}
    />

    {#if data.widgets.length === 0}
      <EmptyState
        data={{
          title: 'Este painel está vazio',
          description: viewState.canEdit
            ? 'Ponha os blocos que a equipe precisa ver: chamados, máquinas, orçamentos.'
            : 'Quem monta este painel ainda não pôs nenhum bloco.',
        }}
        ui={{ icon: LayoutDashboard }}
      >
        {#if viewState.isEditing}
          <ActionButton data={{ label: 'Novo bloco' }} ui={{ icon: Plus }} actions={{ onClick: () => actions.onNewWidget() }} />
        {:else if viewState.canEdit}
          <ActionButton data={{ label: 'Editar painel' }} ui={{ icon: Pencil }} actions={{ onClick: actions.onStartEdit }} />
        {/if}
      </EmptyState>
    {:else}
      <BoardCanvas
        data={{ widgets: data.widgets, layout: data.layout, results: data.results, filterNames, periodNotes }}
        state={{ isEditing: viewState.isEditing }}
        actions={{ onLayoutChange: actions.onLayoutChange, onEditWidget: actions.onEditWidget, onRemoveWidget: actions.onRemoveWidget }}
      />
    {/if}
  {/if}

  <WidgetEditorDialog
    data={{ editing: data.editing, filters: data.savedFilters, preview: data.preview }}
    actions={{ onClose: actions.onCloseEditor, onSubmit: actions.onSubmitWidget, onPreviewChange: actions.onPreviewChange }}
  />

  <FilterBuilderDialog
    data={{ module: data.module, filters: data.savedFilters, archived: data.archivedFilters, editing: data.editingFilter }}
    state={{
      isOpen: viewState.isFilterDialogOpen,
      isSaving: viewState.isFilterSaving,
      isArchiving: viewState.isFilterArchiving,
      error: viewState.filterError,
    }}
    actions={{
      onClose: actions.onCloseFilters,
      onNew: actions.onNewFilter,
      onEdit: actions.onEditFilter,
      onCancelEdit: actions.onCancelEditFilter,
      onSave: actions.onSaveFilter,
      onArchive: actions.onArchiveFilter,
      onRestore: actions.onRestoreFilter,
    }}
  />
</div>
