<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { canEditSystem } from '@template/shared/domain/system-access.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import { useGithubConnectionModel } from '$lib/hooks/use-github-connection/use-github-connection.svelte';
  import { useSoftwareProjectListModel } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
  import ProjectListView from './components/azuos-project-list-view/azuos-project-list-view.svelte';
  import ProjectFormSlot from './project-form-slot.svelte';

  const listModel = useSoftwareProjectListModel();
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

<ProjectListView
  data={listModel.data}
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
  }}
/>

{#if isFormOpen}
  <ProjectFormSlot project={editingProject} onClose={handleCloseForm} />
{/if}
