<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { buildGitGraph } from '$lib/utils/git-graph.util';
  import { projectMapEntryFixture } from '$lib/utils/project-map.fixture.test-support';
  import Component from './azuos-git-graph.svelte';

  /**
   * O git graph no desenho do lazygit: cada commit uma linha, a develop numa lane e cada branch
   * noutra, na cor do git-flow; a branch nova pulsa tracejada. Para usar no mapa do projeto e na
   * tarefa de Sistema; as linhas vêm de `buildGitGraph`.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosGitGraph',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const entry = projectMapEntryFixture();
  const now = new Date('2026-11-22T12:00:00Z');
</script>

<Story name="Default" args={{ data: { rows: buildGitGraph(entry.commits, entry.branches, {}, now) } }} />
<Story name="Só merges e branches" args={{ data: { rows: buildGitGraph(entry.commits, entry.branches, { onlyMerges: true }, now) } }} />
<Story name="Vazio" args={{ data: { rows: [] } }} />
