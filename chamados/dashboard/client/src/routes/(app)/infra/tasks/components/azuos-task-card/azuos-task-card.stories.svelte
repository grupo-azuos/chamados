<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
  import Component from './azuos-task-card.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskCard',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onOpen: fn(), onMove: fn(), onRemove: fn() };
</script>

<Story name="Default" args={{ data: { task: taskFixture(), now: TEST_NOW }, actions }} />
<Story name="Atrasada" args={{ data: { task: taskFixture({ dueDate: '2026-11-20' }), now: TEST_NOW }, actions }} />
<Story name="DaManutencao" args={{ data: { task: taskFixture({ origin: 'maintenance', computerId: 4, title: 'Preventiva — Computador 04', owner: null }), now: TEST_NOW }, actions }} />
<Story name="Finalizada" args={{ data: { task: taskFixture({ status: 'done', finishedAt: '2026-11-21T10:00:00.000Z', progress: { done: 2, total: 2 } }), now: TEST_NOW }, actions }} />
