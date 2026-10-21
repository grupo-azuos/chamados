<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import MaintenanceScheduleDialog from './azuos-maintenance-schedule-dialog.svelte';

  const actions = { onChange: fn(), onBlur: fn(), onSubmit: fn(), onClose: fn() };
  const blank = { scheduledFor: { value: '', error: null }, note: { value: '', error: null } };

  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosMaintenanceScheduleDialog',
    component: MaintenanceScheduleDialog,
  });
</script>

<Story name="Create" args={{ data: { mode: 'create', machineName: 'Contábil — fechamento', fields: blank }, state: { isOpen: true }, actions }} />
<Story name="Reschedule" args={{ data: { mode: 'edit', machineName: 'Contábil — fechamento', fields: { scheduledFor: { value: '2026-11-05', error: null }, note: { value: 'Trocar pasta térmica', error: null } } }, state: { isOpen: true }, actions }} />
<Story name="PastDate" args={{ data: { mode: 'create', machineName: 'Recepção', fields: { ...blank, scheduledFor: { value: '2026-01-01', error: 'Escolha hoje ou um dia depois de hoje' } } }, state: { isOpen: true }, actions }} />
<Story name="Submitting" args={{ data: { mode: 'create', machineName: 'Recepção', fields: { ...blank, scheduledFor: { value: '2026-11-05', error: null } } }, state: { isOpen: true, isSubmitting: true }, actions }} />
<Story name="ServerError" args={{ data: { mode: 'create', machineName: 'Recepção', fields: { ...blank, scheduledFor: { value: '2026-11-05', error: null } } }, state: { isOpen: true, error: 'Máquina não encontrada ou fora de uso.' }, actions }} />
<!-- Caso limite: nome de máquina longo não pode empurrar o modal para fora da tela. -->
<Story name="LongMachineName" args={{ data: { mode: 'create', machineName: 'Notebook do financeiro que fica na sala de reuniões do segundo andar perto da janela', fields: blank }, state: { isOpen: true }, actions }} />
