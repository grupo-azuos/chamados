<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { projectMapEntryFixture } from '$lib/utils/project-map.fixture.test-support';
  import Component from './azuos-project-map.svelte';

  /**
   * O mapa dos projetos: cada sistema numa ilha, com o git graph (commits e branches na cor do
   * git-flow; a branch nova pulsa), issues, PRs, merges, chamados e tarefas. O que está em aberto
   * tem a linha tracejada e animada. Período e Responsável recortam tudo.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosProjectMap',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = {
    onProjectsChange: fn(),
    onIslandMove: fn(),
    onResetLayout: fn(),
    onPeriodChange: fn(),
    onPersonChange: fn(),
    onOnlyMergesChange: fn(),
  };
  const filters = {
    period: { from: null, to: null },
    personId: '',
    people: [{ id: 'u-1', name: 'Ana Souza', photo: null }],
    personLogin: null,
    onlyMerges: false,
  };
  const projects = [
    { id: 1, name: 'Paralegal' },
    { id: 2, name: 'Chamados' },
  ];
  const entries = [projectMapEntryFixture(1, 'Paralegal'), projectMapEntryFixture(2, 'Chamados')];
</script>

<Story name="Default" args={{ data: { entries, projects, projectIds: [], positions: {}, ...filters }, actions }} />
<Story name="Só merges e branches" args={{ data: { entries, projects, projectIds: [], positions: {}, ...filters, onlyMerges: true }, actions }} />
<Story name="Vazio" args={{ data: { entries: [], projects, projectIds: ['9'], positions: {}, ...filters }, actions }} />
<Story name="Carregando" args={{ data: { entries: [], projects, projectIds: [], positions: {}, ...filters }, state: { isLoading: true }, actions }} />
