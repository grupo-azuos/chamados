<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-calendar.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskCalendar',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onOpen: fn(), onRangeChange: fn() };
  const tasks = [
    taskFixture(),
    taskFixture({ id: 2, title: 'Atrasada', dueDate: '2026-11-20' }),
    taskFixture({ id: 7, title: 'Finalizada', status: 'done', dueDate: '2026-11-10' }),
    ...[3, 4, 5, 6].map((id) => taskFixture({ id, title: `Mesmo dia ${id}`, dueDate: '2026-11-25' })),
  ];
</script>

<Story name="Default" args={{ data: { tasks, month: '2026-11', now: TEST_NOW }, actions }} />
<Story name="MesVazio" args={{ data: { tasks: [], month: '2026-12', now: TEST_NOW }, actions }} />
