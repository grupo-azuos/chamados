<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
  import Component from './azuos-task-timeline.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskTimeline',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onOpen: fn(), onMonthChange: fn() };
  const tasks = [
    taskFixture(),
    taskFixture({ id: 2, title: 'Atrasada', startDate: '2026-11-02', dueDate: '2026-11-20' }),
    taskFixture({ id: 3, title: 'Atravessa o mês', startDate: '2026-10-25', dueDate: '2026-12-05', status: 'reopened' }),
    taskFixture({ id: 4, title: 'Finalizada', status: 'done', startDate: '2026-11-03', dueDate: '2026-11-09' }),
  ];
</script>

<Story name="Default" args={{ data: { tasks, month: '2026-11', today: '2026-11-23', now: TEST_NOW }, actions }} />
<Story name="MesVazio" args={{ data: { tasks, month: '2027-03', today: '2026-11-23', now: TEST_NOW }, actions }} />
