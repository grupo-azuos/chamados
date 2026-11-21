<script lang="ts">
  import BoardDrillBanner from '$lib/components/azuos-board-drill-banner/azuos-board-drill-banner.svelte';
  import ArchivedList from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
  import {
    useArchivedMaintenancesModel,
    useArchivedSchedulesModel,
  } from '$lib/hooks/use-archived-items/use-archived-items.svelte';
  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';

  import MaintenanceListView from './components/azuos-maintenance-list-view/azuos-maintenance-list-view.svelte';
  import { useMaintenanceListModel } from '$lib/hooks/use-maintenance-list/use-maintenance-list.svelte';
  import MaintenanceFormSlot from './maintenance-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário, e com qual
   * registro (ou com qual máquina já escolhida, quando ele foi aberto por um lembrete de
   * preventiva).
   */
  const list = useMaintenanceListModel();
  const archived = useArchivedMaintenancesModel();
  const closedSchedules = useArchivedSchedulesModel();

  type FormTarget = { maintenance: Maintenance | null; computerId: number | null };

  let form = $state<FormTarget | null>(null);
</script>

<svelte:head>
  <title>Manutenção</title>
</svelte:head>

<!-- Vindo de um clique no Painel, o histórico mostra no alto o recorte que o trouxe. -->
<div class="flex w-full flex-col">
  {#if list.data.drillBanner}
    <BoardDrillBanner
      data={list.data.drillBanner}
      actions={{ onClear: list.actions.onClearDrill, onBack: list.actions.onBackToBoard }}
    />
  {/if}
  <MaintenanceListView
    data={list.data}
    state={list.state}
    actions={{
      ...list.actions,
      onRegister: (computerId?: number) =>
        (form = { maintenance: null, computerId: computerId ?? null }),
      onEdit: (maintenance: Maintenance) => (form = { maintenance, computerId: null }),
    }}
  />
</div>

<!-- O que foi excluído some da lista e aparece aqui, fechado, com o "Desfazer". -->
<ArchivedList
  data={archived.data}
  ui={{ className: 'mt-6' }}
  state={archived.state}
  actions={archived.actions}
/>

<!-- O agendamento cumprido ou cancelado sai da agenda; o cancelado por engano volta daqui. -->
<ArchivedList
  data={{ ...closedSchedules.data, title: 'Agendamentos encerrados' }}
  ui={{ className: 'mt-3' }}
  state={closedSchedules.state}
  actions={closedSchedules.actions}
/>

<!-- `{#key}` pelo registro: trocar de manutenção monta um formulário NOVO, com os valores
     dela. -->
{#if form}
  {#key form.maintenance?.id ?? `new-${form.computerId ?? 'any'}`}
    <MaintenanceFormSlot
      maintenance={form.maintenance}
      computerId={form.computerId}
      onClose={() => (form = null)}
    />
  {/key}
{/if}
