<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-map.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskMap',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onPeopleChange: fn(), onIslandMove: fn(), onResetLayout: fn() };
  const tasks = [
    taskFixture({
      id: 1,
      people: [{ id: 'bia', name: 'Bia Souza', avatarUrl: null }],
      links: [
        { id: 1, kind: 'computer', targetId: 3, label: 'Computador 03' },
        { id: 2, kind: 'ticket', targetId: 9, label: 'CH-0009' },
      ],
    }),
    taskFixture({ id: 2, title: 'Finalizada', status: 'done', links: [{ id: 3, kind: 'part', targetId: 1, label: 'SSD 480GB' }] }),
    taskFixture({ id: 3, title: 'Sem responsável', owner: null }),
  ];
</script>

<Story name="Default" args={{ data: { tasks, people: [], peopleIds: [], positions: {}, now: TEST_NOW }, actions }} />
<Story name="Vazio" args={{ data: { tasks, people: [], peopleIds: ['ninguem'], positions: {}, now: TEST_NOW }, actions }} />
