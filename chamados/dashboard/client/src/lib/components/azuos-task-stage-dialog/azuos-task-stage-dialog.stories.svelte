<script module lang="ts">
  import { COMPANY_COLOR_PALETTE } from '$lib/utils/company-color.util';
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
  /* A cor de cada situação é a que a pessoa escolheu — aqui, da paleta do projeto. */
  const [, , PURPLE, , ORANGE] = COMPANY_COLOR_PALETTE;
  const actions = { onCreate: fn(), onUpdate: fn(), onMove: fn(), onArchive: fn(), onClose: fn() };
  const stages = [
    { id: 4, area: 'infra' as const, label: 'Aguardando peça', color: ORANGE, position: 0 },
    { id: 5, area: 'infra' as const, label: 'Com o fornecedor', color: PURPLE, position: 1 },
  ];
</script>

<Story name="Default" args={{ data: { stages }, state: { isOpen: true }, actions }} />
<Story name="SemSituacoes" args={{ data: { stages: [] }, state: { isOpen: true }, actions }} />
<Story name="ComErro" args={{ data: { stages }, state: { isOpen: true, error: 'Já existe uma situação com esse nome.' }, actions }} />
