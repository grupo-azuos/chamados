<script lang="ts">
  import Network from '@lucide/svelte/icons/network';

  import ExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import TraceabilityMap from '$lib/components/azuos-traceability-map/azuos-traceability-map.svelte';
  import TraceabilityPicker from '$lib/components/azuos-traceability-picker/azuos-traceability-picker.svelte';
  import { useTraceabilityModel } from '$lib/hooks/use-traceability/use-traceability.svelte';
  import TaskDetailScreen from '../../task-detail-screen.svelte';
  import ComputerDetailScreen from '../computers/[id]/computer-detail-screen.svelte';
  import PartLedgerByIdSlot from '../parts/part-ledger-by-id-slot.svelte';
  import TicketDetailScreen from '../tickets/[id]/ticket-detail-screen.svelte';

  /**
   * A rota só compõe: chama o model e entrega para as views (CONTRIBUTING §3).
   *
   * Como no Paralegal, tudo o que se clica no mapa abre AQUI, num diálogo sobre ele, com o
   * endereço guardando o que está aberto: o link colado já abre o diálogo, e o voltar do navegador
   * o fecha e devolve o mapa.
   */
  const traceability = useTraceabilityModel();

  const OPEN_TITLES = { computer: 'Computador', ticket: 'Chamado', task: 'Tarefa', part: 'Peça' } as const;
  const open = $derived(traceability.data.open);
</script>

<svelte:head>
  <title>Rastreabilidade</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <PageHeader
    data={{
      title: 'Rastreabilidade',
      description: 'Quem usa cada computador, de que departamento, e o que passou por ele.',
    }}
    ui={{ icon: Network }}
  />
  <TraceabilityMap
    data={traceability.data}
    state={traceability.state}
    actions={{ onFocusChange: traceability.actions.onFocusChange, onOpenPicker: traceability.actions.onOpenPicker }}
  />
</div>

{#if traceability.data.picker.isOpen}
  <TraceabilityPicker
    data={{ ...traceability.data.picker, focus: traceability.data.focus, selectedId: traceability.data.id }}
    state={{ isOpen: true, isLoading: traceability.state.isPickerLoading }}
    actions={{
      onSearch: traceability.actions.onSearch,
      onDepartmentChange: traceability.actions.onDepartmentChange,
      onPick: traceability.actions.onPick,
      onClose: traceability.actions.onClosePicker,
    }}
  />
{/if}

<!-- `{#key}` pelo registro: trocar de chamado monta a ficha NOVA, com os dados dele. -->
{#if open?.kind === 'part'}
  {#key open.id}
    <PartLedgerByIdSlot id={open.id} onClose={traceability.actions.onCloseRecord} />
  {/key}
{:else if open}
  <ExpandableScreen
    data={{ title: OPEN_TITLES[open.kind], description: 'Esc ou o voltar do navegador devolvem o mapa.' }}
    state={{ isOpen: true }}
    actions={{ onClose: traceability.actions.onCloseRecord }}
  >
    <div class="h-full overflow-y-auto p-6">
      {#key `${open.kind}:${open.id}`}
        {#if open.kind === 'ticket'}
          <TicketDetailScreen id={open.id} onBack={traceability.actions.onCloseRecord} isEmbedded />
        {:else if open.kind === 'computer'}
          <ComputerDetailScreen id={open.id} onBack={traceability.actions.onCloseRecord} isEmbedded />
        {:else}
          <TaskDetailScreen area="infra" id={open.id} onBack={traceability.actions.onCloseRecord} isEmbedded />
        {/if}
      {/key}
    </div>
  </ExpandableScreen>
{/if}
