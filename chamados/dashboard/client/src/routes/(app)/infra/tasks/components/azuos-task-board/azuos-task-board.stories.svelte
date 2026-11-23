<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
  import Component from './azuos-task-board.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskBoard',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const tasks = [
    taskFixture(),
    taskFixture({ id: 2, title: 'Impressora da recepção', origin: 'ticket', ticketId: 56 }),
    taskFixture({ id: 3, title: 'Comprar teclados', status: 'reopened' }),
    taskFixture({ id: 4, title: 'Organizar o rack', status: 'done' }),
  ];
  const actions = { onOpen: fn(), onMove: fn(), onRefuse: fn() };
</script>

<Story name="Default" args={{ data: { tasks, now: TEST_NOW }, actions }} />
<!-- Sem nada: cada coluna pede para arrastar. -->
<Story name="Vazio" args={{ data: { tasks: [], now: TEST_NOW }, actions }} />
<!-- Salvando um movimento: nada se arrasta. -->
<Story name="Movendo" args={{ data: { tasks, now: TEST_NOW }, state: { isMoving: true }, actions }} />
