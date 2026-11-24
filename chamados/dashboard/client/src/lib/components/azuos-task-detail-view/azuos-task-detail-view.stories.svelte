<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-detail-view.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskDetailView',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = {
    onFinish: fn(), onReopen: fn(), onToggleStep: fn(), onEditSteps: fn(), onStepsChange: fn(), onSaveSteps: fn(),
    onCancelSteps: fn(), onEdit: fn(), onRemoveLink: fn(), onRemove: fn(), onRestore: fn(), onLink: fn(),
  };
  const state = { isLoading: false, isHistoryLoading: false, isBusy: false, error: null, actionError: null };
  const task = taskFixture({
    origin: 'manual',
    people: [{ id: 'bia', name: 'Bia Souza', avatarUrl: null }],
    links: [
      { id: 1, kind: 'computer', targetId: 3, label: 'Computador 03', source: 'task' as const },
      { id: 2, kind: 'ticket', targetId: 9, label: null, source: 'task' as const },
    ],
  });
  const timeline = [
    {
      id: 1,
      kindLabel: 'Marcou uma etapa da tarefa',
      tone: 'info' as const,
      authorName: 'Ana Prado',
      createdAt: '2026-11-20T12:24:00.000Z',
      lines: ['Tarefa: Trocar o switch da sala 2', 'Etapa: Feita'],
    },
  ];
</script>

<Story name="Default" args={{ data: { task, timeline, stepsDraft: null, now: TEST_NOW }, state, actions }} />
<Story
  name="PersonalizandoOFluxo"
  args={{ data: { task, timeline, stepsDraft: [{ id: 11, label: 'Comprar' }, { label: '' }], now: TEST_NOW }, state, actions }}
/>
<Story name="DoChamado" args={{ data: { task: taskFixture({ origin: 'ticket', ticketId: 56 }), timeline, stepsDraft: null, now: TEST_NOW }, state, actions }} />
<Story name="NaoEncontrada" args={{ data: { task: null, timeline: [], stepsDraft: null }, state: { ...state, error: 'Tarefa não encontrada.' }, actions }} />
