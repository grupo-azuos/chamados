<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { localDayOf } from '@template/shared/domain/maintenance.util';

  import MaintenanceScheduleCard from './azuos-maintenance-schedule-card.svelte';

  const DAY = 24 * 60 * 60 * 1000;
  const actions = { onSchedule: fn(), onCancel: fn(), onRegister: fn() };
  const dayFromNow = (days: number) => localDayOf(new Date(Date.now() + days * DAY));
  const schedule = {
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: 'Contábil — fechamento',
    computerDepartment: 'contabil' as const,
    scheduledFor: dayFromNow(15),
    note: 'Limpeza interna e troca de pasta térmica',
    createdAt: new Date().toISOString(),
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
  };
  const recent = new Date(Date.now() - 20 * DAY).toISOString();

  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosMaintenanceScheduleCard',
    component: MaintenanceScheduleCard,
  });
</script>

<Story name="Scheduled" args={{ data: { schedule, lastPreventiveAt: recent }, actions }} />
<Story name="ScheduledToday" args={{ data: { schedule: { ...schedule, scheduledFor: dayFromNow(0) }, lastPreventiveAt: recent }, actions }} />
<Story name="ScheduledLate" args={{ data: { schedule: { ...schedule, scheduledFor: dayFromNow(-3), note: null }, lastPreventiveAt: recent }, actions }} />
<Story name="NextPreventive" args={{ data: { schedule: null, lastPreventiveAt: recent }, actions }} />
<Story name="PreventiveOverdue" args={{ data: { schedule: null, lastPreventiveAt: new Date(Date.now() - 120 * DAY).toISOString() }, actions }} />
<Story name="NeverServiced" args={{ data: { schedule: null, lastPreventiveAt: null }, actions }} />
<Story name="Loading" args={{ data: { schedule: null, lastPreventiveAt: null }, state: { isLoading: true }, actions }} />
<Story name="Cancelling" args={{ data: { schedule, lastPreventiveAt: recent }, state: { isCancelling: true }, actions }} />
<Story name="CancelError" args={{ data: { schedule, lastPreventiveAt: recent }, state: { error: 'Não consegui cancelar. Tente de novo.' }, actions }} />
<!-- Caso limite: observação longa quebra linha, não estoura o cartão. -->
<Story name="LongNote" args={{ data: { schedule: { ...schedule, note: 'Trocar a fonte, limpar o cooler do processador, conferir os cabos SATA, atualizar a BIOS e verificar o estado da bateria da placa-mãe antes de devolver a máquina ao usuário' }, lastPreventiveAt: recent }, actions }} />
