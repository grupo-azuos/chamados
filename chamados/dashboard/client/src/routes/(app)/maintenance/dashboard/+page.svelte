<script lang="ts">
  import BoardView from '$lib/components/azuos-board-view/azuos-board-view.svelte';
  import { useDashboardBoardModel } from '$lib/hooks/use-dashboard-board/use-dashboard-board.svelte';
  import { useSavedFiltersModel } from '$lib/hooks/use-saved-filters/use-saved-filters.svelte';

  /**
   * A rota só compõe: chama os models e entrega para a view (CONTRIBUTING §3).
   *
   * O painel é DESTE módulo: a página passa o módulo aos models, e tudo o que eles buscam e
   * gravam é dele — as fontes, os blocos, os filtros salvos. O mesmo painel nos três módulos,
   * cada um com os seus dados.
   */
  const board = useDashboardBoardModel('manutencao');
  const filters = useSavedFiltersModel('manutencao');
</script>

<svelte:head>
  <title>Painel da Manutenção</title>
</svelte:head>

<BoardView
  data={{
    ...board.data,
    savedFilters: filters.data.filters,
    archivedFilters: filters.data.archived,
    editingFilter: filters.data.editing,
  }}
  state={{
    ...board.state,
    isFilterDialogOpen: filters.state.isOpen,
    isFilterSaving: filters.state.isSaving,
    isFilterArchiving: filters.state.isArchiving,
    filterError: filters.state.error,
  }}
  actions={{
    ...board.actions,
    onOpenFilters: filters.actions.onOpen,
    onCloseFilters: filters.actions.onClose,
    onNewFilter: filters.actions.onNew,
    onEditFilter: filters.actions.onEdit,
    onCancelEditFilter: filters.actions.onCancelEdit,
    onSaveFilter: filters.actions.onSave,
    onArchiveFilter: filters.actions.onArchive,
    onRestoreFilter: filters.actions.onRestore,
  }}
/>
