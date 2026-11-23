<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { COMPANY_COLOR_PALETTE } from '$lib/utils/company-color.util';
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
  const actions = {
    onClose: fn(),
    onCreate: fn(async () => true),
    onUpdate: fn(async () => true),
    onMove: fn(),
    onRemove: fn(async () => true),
    onArchiveOpenChange: fn(),
    onRestore: fn(),
  };
  const stages = [
    { id: 4, area: 'infra' as const, label: 'Aguardando peça', color: ORANGE, icon: 'hourglass', position: 0, archivedAt: null },
    { id: 5, area: 'infra' as const, label: 'Com o fornecedor', color: PURPLE, icon: 'truck', position: 1, archivedAt: null },
  ];
  const archivedStages = [{ key: '9', label: 'Na garantia', archivedAt: '2026-11-20T10:00:00.000Z', canRestore: true }];
  const state = { isOpen: true, isSaving: false, error: null, archive: { isLoading: false, restoringKey: null, error: null } };
</script>

<Story name="Nova" args={{ data: { editing: null, stages, archivedStages }, state, actions }} />
<Story name="Editando" args={{ data: { editing: stages[1] ?? null, stages, archivedStages }, state, actions }} />
<Story
  name="ComErro"
  args={{ data: { editing: null, stages, archivedStages }, state: { ...state, error: 'Já existe uma situação com esse nome.' }, actions }}
/>
