<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Component from './azuos-task-history.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskHistory',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const entries = [
    {
      id: 2,
      kindLabel: 'Marcou uma etapa da tarefa',
      tone: 'info' as const,
      authorName: 'Ana Prado',
      createdAt: '2026-11-20T12:24:00.000Z',
      lines: ['Tarefa: Trocar o switch', 'Etapa: Feita'],
    },
    {
      id: 1,
      kindLabel: 'Mudou a situação da tarefa',
      tone: 'success' as const,
      authorName: 'Bia Souza',
      createdAt: '2026-11-19T15:00:00.000Z',
      lines: ['Tarefa: Trocar o switch', 'Situação: Finalizada'],
    },
  ];
</script>

<Story name="Default" args={{ data: { entries } }} />
<Story name="Vazia" args={{ data: { entries: [] } }} />
<Story name="Carregando" args={{ data: { entries: [] }, state: { isLoading: true } }} />
