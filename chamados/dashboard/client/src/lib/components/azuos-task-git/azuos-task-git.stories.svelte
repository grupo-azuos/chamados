<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { projectMapEntryFixture } from '$lib/utils/project-map.fixture.test-support';
  import Component from './azuos-task-git.svelte';

  /**
   * As branches da tarefa de Sistema: as que levam a tarefa, o chamado ou a issue no nome, na cor
   * do git-flow (a nova pulsa), e o git graph do sistema embaixo.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosTaskGit',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const entry = projectMapEntryFixture();
  const project = { id: 1, name: 'Paralegal', repositoryUrl: 'grupo-azuos/paralegal' };
  const branches = entry.branches.map((branch) => ({ ...branch, isOfTask: branch.name !== 'develop' }));
</script>

<Story name="Default" args={{ data: { git: { project, commits: entry.commits, branches }, now: new Date('2026-11-22T12:00:00Z') } }} />
<Story name="Sem branch da tarefa" args={{ data: { git: { project, commits: entry.commits, branches: branches.map((branch) => ({ ...branch, isOfTask: false })) } } }} />
<Story name="Sem sistema" args={{ data: { git: { project: null, commits: [], branches: [] } } }} />
