<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-task-stage-dialog.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskStageDialog',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onCreate: fn(), onUpdate: fn(), onMove: fn(), onArchive: fn(), onClose: fn() };
  const stages = [
    { id: 4, area: 'infra' as const, label: 'Aguardando peça', color: '#ff9500', position: 0 },
    { id: 5, area: 'infra' as const, label: 'Com o fornecedor', color: '#5856d6', position: 1 },
  ];
</script>

<Story name="Default" args={{ data: { stages }, state: { isOpen: true }, actions }} />
<Story name="SemSituacoes" args={{ data: { stages: [] }, state: { isOpen: true }, actions }} />
<Story name="ComErro" args={{ data: { stages }, state: { isOpen: true, error: 'Já existe uma situação com esse nome.' }, actions }} />
