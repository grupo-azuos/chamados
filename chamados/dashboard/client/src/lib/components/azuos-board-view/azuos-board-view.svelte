<script lang="ts" module>
  import {
    type BoardFilter,
    type BoardFilterDisplay,
    type BoardFilterWidth,
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
  import { type BoardFilterPlaceChange } from '$lib/utils/board-draft.util';
  import { type BoardItem } from '$lib/utils/widget-items.util';

  /**
   * O PAINEL DE UM MÓDULO — as abas dos três painéis (Equipe, Gestor, Pessoal) e o painel. Quem
   * não pode editar só vê e atualiza; quem pode clica em "Editar painel" e a montagem abre em TELA
   * CHEIA, por cima do menu do sistema (`AzuosBoardStudio`), num rascunho que só "Guardar" grava.
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
      onNewWidget: (kind?: WidgetKind, place?: Omit<LayoutItem, 'i'>) => void;
      onEditWidget: (id: string) => void;
      onCloseEditor: () => void;
      onSubmitWidget: (widget: Widget) => void;
      onRemoveWidget: (id: string) => void;
      /** O clique num item de um bloco: abre a lista da fonte com o recorte. */
      onOpenItem?: (widget: Widget, item: BoardItem) => void;
      onPreviewChange: (widget: Widget) => void;
      onFilterValueChange: (patch: Partial<BoardFilterValues>) => void;
      onClearFilterValues: () => void;
      onAddBoardFilter: (kind: BoardFilterKind) => void;
      onRemoveBoardFilter: (id: string) => void;
      onBoardFilterDisplayChange: (id: string, display: BoardFilterDisplay) => void;
      onBoardFilterWidthChange: (id: string, width: BoardFilterWidth) => void;
      onBoardFilterPlaceChange: (places: readonly BoardFilterPlaceChange[]) => void;
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
    if (!updatedAt) return 'O painel padrão do módulo. Os números se renovam a cada 5 minutos.';
    const when = new Date(updatedAt).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    });

    return `Montado em ${when}. Os números se renovam a cada 5 minutos.`;
  }
</script>

<script lang="ts">
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Pencil from '@lucide/svelte/icons/pencil';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BoardCanvas from '$lib/components/azuos-board-canvas/azuos-board-canvas.svelte';
  import BoardFilterBar from '$lib/components/azuos-board-filter-bar/azuos-board-filter-bar.svelte';
  import BoardStudio from '$lib/components/azuos-board-studio/azuos-board-studio.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterBuilderScreen from '$lib/components/azuos-filter-builder-screen/azuos-filter-builder-screen.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import WidgetEditorDialog from '$lib/components/azuos-widget-editor-dialog/azuos-widget-editor-dialog.svelte';
  import { fitGroup, followTitle } from '$lib/utils/widget-editor.util';

  let { data, state: viewState, actions }: AzuosBoardViewProps = $props();

  const filterNames = $derived(Object.fromEntries(data.savedFilters.map((filter) => [filter.id, filter.name])));
  const scopeLabel = $derived(data.scopes.find((option) => option.value === data.scope)?.label ?? '');

  /* Trocar o tipo pelo próprio bloco acerta o agrupamento, como no editor. */
  function changeKind(id: string, kind: WidgetKind) {
    const widget = data.widgets.find((item) => item.id === id);
    if (widget) actions.onSubmitWidget(followTitle(widget, fitGroup({ ...widget, kind })));
  }
</script>

<div class="flex w-full flex-col gap-5">
  <PageHeader data={{ title: 'Painel', description: updatedLabel(data.updatedAt) }} ui={{ icon: LayoutDashboard }} />

  <!-- Uma linha só: à esquerda, qual painel se vê (as abas no tamanho delas, não esticadas na
       largura toda); à direita, o que se faz com ele. -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    {#if data.scopes.length > 1}
      <SegmentedControl
        data={{ value: data.scope, options: data.scopes }}
        ui={{ ariaLabel: 'Qual painel', className: 'w-fit' }}
        state={{ isDisabled: viewState.isEditing }}
        actions={{ onChange: actions.onScopeChange }}
      />
    {:else}
      <span></span>
    {/if}
    <div class="flex flex-wrap gap-2">
      <ActionButton
        data={{ label: 'Atualizar', loadingLabel: 'Atualizando…' }}
        ui={{ variant: 'secondary', icon: RefreshCw }}
        state={{ isLoading: viewState.isRefreshing }}
        actions={{ onClick: actions.onRefresh }}
      />
      {#if viewState.canEdit}
        <ActionButton data={{ label: 'Editar painel' }} ui={{ icon: Pencil }} actions={{ onClick: actions.onStartEdit }} />
      {/if}
    </div>
  </div>

  {#if viewState.error && !viewState.isEditing}
    <ErrorState data={{ message: viewState.error }} ui={{ variant: 'inline' }} />
  {/if}

  {#if viewState.isLoading}
    <LoadingState data={{ label: 'Carregando o painel…' }} />
  {:else}
    <BoardFilterBar
      data={{ filters: data.boardFilters, values: data.filterValues, counts: data.filterCounts }}
      actions={{ onChange: actions.onFilterValueChange, onClear: actions.onClearFilterValues }}
    />
    <BoardCanvas
      data={{
        widgets: data.widgets,
        layout: data.layout,
        results: data.results,
        filterNames,
        boardPeriod: data.filterValues.period,
      }}
      state={{ isEditing: false }}
      actions={{
        onLayoutChange: actions.onLayoutChange,
        onEditWidget: actions.onEditWidget,
        onRemoveWidget: actions.onRemoveWidget,
        onOpenItem: actions.onOpenItem,
      }}
    />
  {/if}

  <BoardStudio
    data={{
      scopeLabel,
      widgets: data.widgets,
      layout: data.layout,
      results: data.results,
      filterNames,
      boardFilters: data.boardFilters,
      filterValues: data.filterValues,
      filterCounts: data.filterCounts,
      weight: data.weight,
    }}
    state={{ isOpen: viewState.isEditing, isSaving: viewState.isSaving, canAdd: viewState.canAdd, error: viewState.error }}
    actions={{
      onFilterValueChange: actions.onFilterValueChange,
      onAddBoardFilter: actions.onAddBoardFilter,
      onRemoveBoardFilter: actions.onRemoveBoardFilter,
      onBoardFilterDisplayChange: actions.onBoardFilterDisplayChange,
      onBoardFilterWidthChange: actions.onBoardFilterWidthChange,
      onBoardFilterPlaceChange: actions.onBoardFilterPlaceChange,
      onClearFilterValues: actions.onClearFilterValues,
      onLayoutChange: actions.onLayoutChange,
      onNewWidget: actions.onNewWidget,
      onEditWidget: actions.onEditWidget,
      onRemoveWidget: actions.onRemoveWidget,
      onChangeKind: changeKind,
      onOpenFilters: actions.onOpenFilters,
      onCancel: actions.onCancelEdit,
      onSave: actions.onSave,
    }}
  />

  <WidgetEditorDialog
    data={{ editing: data.editing, filters: data.savedFilters, preview: data.preview }}
    state={{ isHidden: viewState.isFilterDialogOpen }}
    actions={{
      onClose: actions.onCloseEditor,
      onSubmit: actions.onSubmitWidget,
      onOpenFilters: actions.onOpenFilters,
      onPreviewChange: actions.onPreviewChange,
    }}
  />

  <FilterBuilderScreen
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
