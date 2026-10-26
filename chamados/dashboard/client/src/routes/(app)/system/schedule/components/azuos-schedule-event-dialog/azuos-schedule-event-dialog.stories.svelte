<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ScheduleEventDialog from './azuos-schedule-event-dialog.svelte';
  import { type SoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';

  const mockModel: SoftwareScheduleFormModel = {
    data: {
      mode: 'create',
      fields: {
        kind: { value: 'appointment', error: null },
        title: { value: 'Deploy Portal v2', error: null },
        category: { value: 'deploy', error: null },
        color: { value: 'blue', error: null },
        date: { value: '2026-10-18', error: null },
        startTime: { value: '09:00', error: null },
        endTime: { value: '10:00', error: null },
        projectId: { value: '', error: null },
        note: { value: '', error: null },
      },
    },
    state: {
      isSubmitting: false,
      error: null,
    },
    actions: {
      onChange: fn(),
      onBlur: fn(),
      onSubmit: fn(),
    },
  };

  /* O registro: algo feito, com só a data e a hora, e a descrição do que foi entregue. */
  const recordModel: SoftwareScheduleFormModel = {
    ...mockModel,
    data: {
      mode: 'create',
      fields: {
        ...mockModel.data.fields,
        kind: { value: 'record', error: null },
        title: { value: 'Sistema enviado para revisão', error: null },
        category: { value: 'review', error: null },
        startTime: { value: '16:00', error: null },
        note: { value: 'Enviado para o usuário testar a nova tela de contratos.', error: null },
      },
    },
  };

  const invalidModel: SoftwareScheduleFormModel = {
    ...mockModel,
    data: {
      mode: 'create',
      fields: {
        ...mockModel.data.fields,
        title: { value: '', error: 'Informe o título do compromisso' },
      },
    },
    state: { isSubmitting: false, error: 'Não foi possível falar com o servidor.' },
  };

  /* Caso limite: descrição longa, de várias linhas, numa edição. */
  const longDescriptionModel: SoftwareScheduleFormModel = {
    ...recordModel,
    data: {
      mode: 'edit',
      fields: {
        ...recordModel.data.fields,
        note: {
          value:
            'Enviado para o usuário testar.\nItens: contratos, melhorias no portal, ajuste de filtros, correção do relatório mensal e revisão dos textos de todas as telas do módulo.',
          error: null,
        },
      },
    },
  };

  const { Story } = defineMeta({
    title: 'Features/System/AzuosScheduleEventDialog',
    component: ScheduleEventDialog,
  });
</script>

<Story
  name="Create"
  args={{
    open: true,
    model: mockModel,
    projects: [],
    onClose: fn(),
  }}
/>

<Story
  name="Mobile"
  globals={{ viewport: { value: 'celular' } }}
  args={{ open: true, model: mockModel, projects: [], onClose: fn() }}
/>

<Story
  name="Record"
  args={{ open: true, model: recordModel, projects: [], onClose: fn() }}
/>

<Story
  name="Record editing with long description"
  args={{ open: true, model: longDescriptionModel, projects: [], onClose: fn(), onDelete: fn() }}
/>

<Story
  name="Error"
  args={{ open: true, model: invalidModel, projects: [], onClose: fn() }}
/>
