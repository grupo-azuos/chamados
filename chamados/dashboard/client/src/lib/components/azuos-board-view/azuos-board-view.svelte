<!--
  @component
  O PAINEL DE UM MÓDULO, no formato do Grafana — as abas dos três painéis (Equipe, Gestor,
  Pessoal), o seletor de tempo e o "atualizar a cada" no canto de cima, os filtros (as variáveis)
  numa faixa e os blocos embaixo, cada um com o menu dele (Ver, Editar, Duplicar, Remover).

  Quem pode editar clica em "Editar painel" e o PRÓPRIO painel entra em montagem — sem tela por
  cima: uma barra no alto com Adicionar, Configurações (os filtros), Descartar e Salvar; os blocos
  se arrastam e se redimensionam ali mesmo, e cada um abre no editor de tela cheia. Tudo num
  rascunho que só "Salvar painel" grava.

  Genérico de propósito: os três módulos usam este mesmo painel, cada um com os dados dele.

  - `data`: o módulo, o painel escolhido e as opções, os blocos e as posições, os resultados, o
    rascunho em edição, os filtros do painel, o peso, o "atualizar a cada" e os filtros salvos.
  - `state`: carregando, montando, salvando, atualizando, `canEdit`, `canAdd`, o erro e o diálogo
    dos filtros salvos (aberto, salvando, arquivando, erro).
  - `actions`: trocar de painel, atualizar, entrar e sair da montagem, salvar, mexer nos blocos e
    no editor, mexer nos filtros do painel e criar, editar, arquivar e restaurar filtros salvos.
-->
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
      /** Os filtros que o módulo aceita, para pôr. */
      boardFilterKinds?: readonly BoardFilterKind[];
      filterValues: BoardFilterValues;
      filterCounts: Record<string, FilterCounts>;
      weight: number;
      /** De quanto em quanto o painel se renova sozinho (uma das `REFRESH_OPTIONS`). */
      refreshEvery?: string;
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
      /** A faixa de filtros do painel aberta — a escolha lembrada por painel; sem ela, aberta. */
      isFiltersOpen?: boolean;
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
      /** O "Duplicar" do menu do bloco. */
      onDuplicateWidget?: (id: string) => void;
      /** Quem vê escolheu de quanto em quanto o painel se renova. */
      onRefreshEveryChange?: (value: string) => void;
      /** O clique num item de um bloco: abre a lista da fonte com o recorte. */
      onOpenItem?: (widget: Widget, item: BoardItem) => void;
      onPreviewChange: (widget: Widget) => void;
      onFilterValueChange: (patch: Partial<BoardFilterValues>) => void;
      onClearFilterValues: () => void;
      /** A seta dos "Filtros" abriu ou fechou a faixa — para lembrar neste painel. */
      onFiltersOpenChange?: (isOpen: boolean) => void;
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
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import ListFilter from '@lucide/svelte/icons/list-filter';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Save from '@lucide/svelte/icons/save';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import SquarePlus from '@lucide/svelte/icons/square-plus';
  import { BOARD_FILTER_KIND_LABELS, BOARD_FILTER_KINDS, MAX_BOARD_WEIGHT } from '@template/shared/schemas/dashboard-board.schema';

  import ActionButton, {
    actionButton,
    AzuosButtonPrimitive as Button,
    AzuosDropdownMenuPrimitive as DropdownMenu,
  } from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BoardCanvas from '$lib/components/azuos-board-canvas/azuos-board-canvas.svelte';
  import BoardFilterBar from '$lib/components/azuos-board-filter-bar/azuos-board-filter-bar.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterBuilderScreen from '$lib/components/azuos-filter-builder-screen/azuos-filter-builder-screen.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import AzuosSelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '$lib/components/azuos-sheet/azuos-sheet';
  import WidgetEditorDialog from '$lib/components/azuos-widget-editor-dialog/azuos-widget-editor-dialog.svelte';
  import { REFRESH_MS, REFRESH_OPTIONS } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { fitGroup, followTitle } from '$lib/utils/widget-editor.util';

  let { data, state: viewState, actions }: AzuosBoardViewProps = $props();

  /* Puramente visual: as configurações do painel (os filtros) abertas na lateral. */
  let isSettingsOpen = $state(false);

  const filterNames = $derived(Object.fromEntries(data.savedFilters.map((filter) => [filter.id, filter.name])));
  const scopeLabel = $derived(data.scopes.find((option) => option.value === data.scope)?.label ?? '');
  /* Os filtros que dá para pôr pelo "Adicionar": os do módulo que o painel ainda não tem. */
  const missingFilters = $derived(
    (data.boardFilterKinds ?? BOARD_FILTER_KINDS).filter((kind) => !data.boardFilters.some((filter) => filter.kind === kind)),
  );
  const filterBarData = $derived({ filters: data.boardFilters, values: data.filterValues, counts: data.filterCounts, kinds: data.boardFilterKinds });
  const filterBarActions = $derived({
    onChange: actions.onFilterValueChange,
    onClear: actions.onClearFilterValues,
    onAdd: actions.onAddBoardFilter,
    onRemove: actions.onRemoveBoardFilter,
    onDisplayChange: actions.onBoardFilterDisplayChange,
    onWidthChange: actions.onBoardFilterWidthChange,
    onPlaceChange: actions.onBoardFilterPlaceChange,
  });
  const MENU_ITEM = 'rounded-chip min-h-10 cursor-pointer gap-2 px-3 py-2';

  /* Trocar o tipo pelo próprio bloco acerta o agrupamento, como no editor. */
  function changeKind(id: string, kind: WidgetKind) {
    const widget = data.widgets.find((item) => item.id === id);
    if (widget) actions.onSubmitWidget(followTitle(widget, fitGroup({ ...widget, kind })));
  }

  function closeEdit(next: () => void) {
    isSettingsOpen = false;
    next();
  }
</script>

<div class="flex w-full flex-col gap-5">
  <PageHeader data={{ title: 'Painel', description: updatedLabel(data.updatedAt) }} ui={{ icon: LayoutDashboard }} />

  <!-- A BARRA DE CIMA, como a do Grafana: à esquerda, qual painel se vê; à direita, o seletor de
       tempo, o "Atualizar" com o "atualizar a cada" e o "Editar painel". -->
  <div class="flex flex-wrap items-start justify-between gap-3">
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
    <div class="flex flex-wrap items-start justify-end gap-2">
      <BoardFilterBar data={filterBarData} ui={{ part: 'period' }} actions={{ onChange: actions.onFilterValueChange }} />
      <ActionButton
        data={{ label: 'Atualizar', loadingLabel: 'Atualizando…' }}
        ui={{ variant: 'secondary', icon: RefreshCw }}
        state={{ isLoading: viewState.isRefreshing }}
        actions={{ onClick: actions.onRefresh }}
      />
      {#if actions.onRefreshEveryChange}
        <AzuosSelectField
          data={{ value: data.refreshEvery ?? String(REFRESH_MS), options: [...REFRESH_OPTIONS] }}
          ui={{ ariaLabel: 'Atualizar a cada', className: 'w-36' }}
          actions={{ onChange: actions.onRefreshEveryChange }}
        />
      {/if}
      {#if viewState.canEdit && !viewState.isEditing}
        <ActionButton data={{ label: 'Editar painel' }} ui={{ icon: Pencil }} actions={{ onClick: actions.onStartEdit }} />
      {/if}
    </div>
  </div>

  {#if viewState.isEditing}
    <!-- MONTANDO, no próprio painel: a barra presa no alto, como a do Grafana em edição. -->
    <div
      role="toolbar"
      aria-label="Montando o painel"
      class="rounded-surface bg-card shadow-card sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <p class="text-sm font-semibold">
        Editando o painel {scopeLabel}
        <span class="text-muted-foreground font-normal">· {data.weight} de {MAX_BOARD_WEIGHT} pontos</span>
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button {...props} type="button" class={actionButton({ variant: 'secondary', size: 'lg' })}>
                <Plus aria-hidden="true" />
                Adicionar
                <ChevronDown aria-hidden="true" />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" class="rounded-surface w-64 max-w-[calc(100vw-2rem)] p-1.5 shadow-xl">
            <DropdownMenu.Item class={MENU_ITEM} disabled={!viewState.canAdd} onSelect={() => actions.onNewWidget()}>
              <SquarePlus aria-hidden="true" />
              Bloco
            </DropdownMenu.Item>
            {#if missingFilters.length > 0}
              <DropdownMenu.Separator />
              <DropdownMenu.Label class="text-muted-foreground px-3 text-xs font-medium">Filtro</DropdownMenu.Label>
              {#each missingFilters as kind (kind)}
                <DropdownMenu.Item class={MENU_ITEM} onSelect={() => actions.onAddBoardFilter(kind)}>
                  <ListFilter aria-hidden="true" />
                  {BOARD_FILTER_KIND_LABELS[kind]}
                </DropdownMenu.Item>
              {/each}
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <ActionButton
          data={{ label: 'Configurações' }}
          ui={{ variant: 'secondary', icon: Settings2 }}
          actions={{ onClick: () => (isSettingsOpen = true) }}
        />
        <ActionButton
          data={{ label: 'Descartar' }}
          ui={{ variant: 'ghost' }}
          state={{ isDisabled: viewState.isSaving }}
          actions={{ onClick: () => closeEdit(actions.onCancelEdit) }}
        />
        <ActionButton
          data={{ label: 'Salvar painel', loadingLabel: 'Salvando…' }}
          ui={{ icon: Save }}
          state={{ isLoading: viewState.isSaving }}
          actions={{ onClick: actions.onSave }}
        />
      </div>
    </div>
  {/if}

  {#if viewState.error}
    <ErrorState data={{ message: viewState.error }} ui={{ variant: 'inline' }} />
  {/if}

  {#if viewState.isLoading}
    <LoadingState data={{ label: 'Carregando o painel…' }} />
  {:else}
    <!-- Uma faixa por painel: trocar de painel abre a faixa como ele a deixou (`#key`). -->
    {#key data.scope}
      <BoardFilterBar
        data={filterBarData}
        ui={{ part: 'fields' }}
        state={{ isOpen: viewState.isFiltersOpen }}
        actions={{ onChange: actions.onFilterValueChange, onClear: actions.onClearFilterValues, onOpenChange: actions.onFiltersOpenChange }}
      />
    {/key}
    <BoardCanvas
      data={{
        widgets: data.widgets,
        layout: data.layout,
        results: data.results,
        filterNames,
        boardPeriod: data.filterValues.period,
      }}
      state={{ isEditing: viewState.isEditing, canEdit: viewState.canEdit }}
      actions={{
        onLayoutChange: actions.onLayoutChange,
        onEditWidget: actions.onEditWidget,
        onRemoveWidget: actions.onRemoveWidget,
        onDuplicateWidget: actions.onDuplicateWidget,
        onChangeKind: changeKind,
        onOpenItem: actions.onOpenItem,
      }}
    />
  {/if}

  <!-- AS CONFIGURAÇÕES DO PAINEL, na lateral: os filtros (as variáveis do Grafana) — a ordem, o
       desenho e a largura de cada um, e os que faltam para pôr. -->
  <Sheet bind:open={isSettingsOpen}>
    <!-- Largo: a lista dos filtros cabe numa linha por filtro (nome, desenho, largura, setas), sem
         quebrar. A largura vem pela variante do lado — a do `ui/sheet` (`sm:max-w-sm`) ganharia. -->
    <SheetContent side="right" class="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[min(64rem,90vw)]">
      <SheetHeader>
        <SheetTitle>Configurações do painel</SheetTitle>
        <SheetDescription>Os filtros do painel: a ordem na barra, o desenho e a largura de cada um.</SheetDescription>
      </SheetHeader>
      <div class="px-4 pb-6">
        <BoardFilterBar data={filterBarData} state={{ isEditing: true, isListOpen: true }} actions={filterBarActions} />
      </div>
    </SheetContent>
  </Sheet>

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
