<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { projectMapEntryFixture } from '$lib/utils/project-map.fixture.test-support';
  import Component from './azuos-project-map.svelte';

  /**
   * O mapa dos projetos: cada sistema numa ilha, com issues, PRs, merges, chamados e tarefas. O
   * que está em aberto tem a linha tracejada e animada.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosProjectMap',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onProjectsChange: fn(), onIslandMove: fn(), onResetLayout: fn() };
  const projects = [
    { id: 1, name: 'Paralegal' },
    { id: 2, name: 'Chamados' },
  ];
  const entries = [projectMapEntryFixture(1, 'Paralegal'), projectMapEntryFixture(2, 'Chamados')];
</script>

<Story name="Default" args={{ data: { entries, projects, projectIds: [], positions: {} }, actions }} />
<Story name="Vazio" args={{ data: { entries: [], projects, projectIds: ['9'], positions: {} }, actions }} />
<Story name="Carregando" args={{ data: { entries: [], projects, projectIds: [], positions: {} }, state: { isLoading: true }, actions }} />
