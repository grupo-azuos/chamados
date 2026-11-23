<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
  import Component from './azuos-task-detail-dialog.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskDetailDialog',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onClose: fn(), onEdit: fn(), onMove: fn(), onToggleStep: fn(), onRemoveLink: fn(), onRemove: fn() };
</script>

<Story name="Default" args={{ data: { task: taskFixture(), now: TEST_NOW }, state: { isOpen: true }, actions }} />
<!-- Do chamado: "Abrir o chamado" no lugar de finalizar, sem excluir. -->
<Story name="DoChamado" args={{ data: { task: taskFixture({ origin: 'ticket', ticketId: 56, steps: [], progress: { done: 0, total: 0 } }), now: TEST_NOW }, state: { isOpen: true }, actions }} />
<Story name="ComErro" args={{ data: { task: taskFixture(), now: TEST_NOW }, state: { isOpen: true, error: 'A tarefa já está finalizada.' }, actions }} />
