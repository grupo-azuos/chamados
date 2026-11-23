<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-timeline.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskTimeline',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onShift: fn(), onToday: fn(), onZoom: fn(), onOpen: fn() };
  const tasks = [
    taskFixture(),
    taskFixture({ id: 2, title: 'Atrasada', startDate: '2026-11-17', dueDate: '2026-11-20' }),
    taskFixture({ id: 3, title: 'Atravessa a janela', startDate: '2026-11-10', dueDate: '2027-01-05', status: 'reopened' }),
    taskFixture({ id: 4, title: 'Finalizada', status: 'done', startDate: '2026-11-18', dueDate: '2026-11-24' }),
    taskFixture({ id: 5, title: 'Sem responsável', owner: null, startDate: '2026-11-25', dueDate: '2026-11-27' }),
  ];
  const window = { from: '2026-11-16', to: '2026-12-20' };
</script>

<Story name="Mes" args={{ data: { tasks, window, zoom: 'month', today: '2026-11-23', now: TEST_NOW }, actions }} />
<Story
  name="Semana"
  args={{ data: { tasks, window: { from: '2026-11-23', to: '2026-11-29' }, zoom: 'week', today: '2026-11-23', now: TEST_NOW }, actions }}
/>
<Story name="Vazia" args={{ data: { tasks: [], window, zoom: 'month', today: '2026-11-23', now: TEST_NOW }, actions }} />
<Story name="Carregando" args={{ data: { tasks, window, zoom: 'month', today: '2026-11-23', now: TEST_NOW }, state: { isLoading: true }, actions }} />
