<script lang="ts">
  import BoardDrillBanner from '$lib/components/azuos-board-drill-banner/azuos-board-drill-banner.svelte';
  import ArchivedList from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
  import { useArchivedProjectsModel } from '$lib/hooks/use-archived-items/use-archived-items.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { canEditSystem } from '@template/shared/domain/system-access.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import { useGithubConnectionModel } from '$lib/hooks/use-github-connection/use-github-connection.svelte';
  import { useSoftwareProjectListModel } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
  import ProjectMap from '$lib/components/azuos-project-map/azuos-project-map.svelte';
  import { useProjectMapModel } from '$lib/hooks/use-project-map/use-project-map.svelte';
  import ProjectListView from './components/azuos-project-list-view/azuos-project-list-view.svelte';
  import ProjectFormSlot from './project-form-slot.svelte';

  const listModel = useSoftwareProjectListModel();
  const archived = useArchivedProjectsModel();
  /* O mapa dos projetos (a visão "Mapa"): cada sistema com issues, PRs, chamados e tarefas. */
  const projectMap = useProjectMapModel();
  /* Sincronizar é de quem tem o GitHub vinculado — qualquer papel, e só esses. */
  const github = useGithubConnectionModel(page.data.user?.id ?? '', Boolean(page.data.user?.id));

  let isFormOpen = $state(false);
  let editingProject = $state<SoftwareProject | null>(null);

  function handleRegister() {
    editingProject = null;
    isFormOpen = true;
  }

  function handleEdit(project: SoftwareProject) {
    editingProject = project;
    isFormOpen = true;
  }

  function handleCloseForm() {
    isFormOpen = false;
    editingProject = null;
  }
</script>

<svelte:head>
  <title>Sistemas e Projetos</title>
</svelte:head>

<!-- Vinda de um clique no Painel, a lista mostra no alto o recorte que a trouxe. -->
<div class="flex w-full flex-col">
  {#if listModel.data.drillBanner}
    <BoardDrillBanner
      data={listModel.data.drillBanner}
      actions={{ onClear: listModel.actions.onClearDrill, onBack: listModel.actions.onBackToBoard }}
    />
  {/if}
  <ProjectListView
    data={{ ...listModel.data, view: projectMap.data.view }}
    state={{
      ...listModel.state,
      canEdit: canEditSystem(page.data.user),
      canSync: github.state.isLinked,
      canSyncAll: github.state.isLinked,
    }}
    actions={{
      ...listModel.actions,
      onRegister: handleRegister,
      onEdit: handleEdit,
      onViewTimeline: (project) => goto(`/system/projects/${project.id}`),
      onViewChange: projectMap.actions.onViewChange,
    }}
  >
    {#snippet map()}
      <ProjectMap data={projectMap.data} state={projectMap.state} actions={projectMap.actions} />
    {/snippet}
  </ProjectListView>
</div>

<!-- O que foi excluído some da lista e aparece aqui, fechado, com o "Desfazer". -->
<ArchivedList
  data={archived.data}
  ui={{ className: 'mt-6' }}
  state={archived.state}
  actions={archived.actions}
/>

{#if isFormOpen}
  <ProjectFormSlot project={editingProject} onClose={handleCloseForm} />
{/if}
