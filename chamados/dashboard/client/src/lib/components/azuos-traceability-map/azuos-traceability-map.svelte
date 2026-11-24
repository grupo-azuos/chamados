<!--
  @component
  O MAPA DE RASTREABILIDADE da Infraestrutura — usuário, computador e departamento, e o que passou
  pela máquina (chamados, peças, tarefas), no formato das ilhas do paralegal.

  "Ver por" escolhe o ponto de partida (um computador, um departamento ou uma pessoa) e o campo ao
  lado escolhe qual. O que está em aberto tem a linha tracejada e animada; o responsável de antes
  fica apagado, com a linha pontilhada. "Expandir" põe o mapa na tela inteira.

  - `data`: `focus`, `id`, as opções de cada ponto de partida (`computers`, `departments`,
    `people`) e o `graph` que veio da API (nulo antes da escolha).
  - `state`: `isLoading`, `error`.
  - `actions`: `onFocusChange`, `onIdChange`.
-->
<script lang="ts" module>
  import {
    type TraceabilityFocus,
    type TraceabilityGraph,
  } from '@template/shared/schemas/traceability.schema';

  import { type AzuosComboboxFieldOption } from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  export type AzuosTraceabilityMapProps = {
    data: {
      focus: TraceabilityFocus;
      /** O ponto de partida escolhido; vazio antes da escolha. */
      id: string;
      computers: AzuosComboboxFieldOption[];
      departments: AzuosComboboxFieldOption[];
      people: AzuosPersonPickerPerson[];
      graph: TraceabilityGraph | null;
    };
    state?: { isLoading?: boolean; error?: string | null };
    actions: {
      onFocusChange: (focus: TraceabilityFocus) => void;
      onIdChange: (id: string) => void;
    };
  };

  export const TRACEABILITY_FOCUS_OPTIONS: { value: TraceabilityFocus; label: string }[] = [
    { value: 'computer', label: 'Computador' },
    { value: 'department', label: 'Departamento' },
    { value: 'person', label: 'Pessoa' },
  ];

  const PICK_HINTS: Record<TraceabilityFocus, string> = {
    computer: 'Escolha um computador para ver quem usa, os chamados, as peças e as tarefas dele.',
    department: 'Escolha um departamento para ver as máquinas, quem responde por elas e o que está em aberto.',
    person: 'Escolha uma pessoa para ver as máquinas dela e o que está em aberto nelas.',
  };
</script>

<script lang="ts">
  import Network from '@lucide/svelte/icons/network';

  import ComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import ExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import { buildTraceabilityMap } from '$lib/utils/traceability-map.util';
  import MapCanvas from './azuos-traceability-map-canvas.svelte';

  let { data, state: mapState, actions }: AzuosTraceabilityMapProps = $props();

  let isExpanded = $state(false);

  const map = $derived(data.graph ? buildTraceabilityMap(data.graph) : null);
</script>

{#snippet toolbar()}
  <div class="flex flex-wrap items-center gap-3">
    <SegmentedControl
      data={{ value: data.focus, options: TRACEABILITY_FOCUS_OPTIONS }}
      ui={{ ariaLabel: 'Ver por' }}
      actions={{ onChange: (value) => actions.onFocusChange(value as TraceabilityFocus) }}
    />
    {#if data.focus === 'person'}
      <PersonPickerField
        data={{ value: data.id, people: data.people }}
        ui={{ ariaLabel: 'Pessoa', placeholder: 'Escolha a pessoa', className: 'w-72' }}
        actions={{ onChange: actions.onIdChange }}
      />
    {:else}
      <ComboboxField
        data={{ value: data.id, options: data.focus === 'computer' ? data.computers : data.departments }}
        ui={{
          ariaLabel: data.focus === 'computer' ? 'Computador' : 'Departamento',
          placeholder: data.focus === 'computer' ? 'Escolha o computador' : 'Escolha o departamento',
          className: 'w-72',
        }}
        actions={{ onChange: actions.onIdChange }}
      />
    {/if}
    <ul aria-label="Legenda" class="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
      <li class="flex items-center gap-1.5">
        <svg aria-hidden="true" width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="var(--primary)" stroke-width="2" stroke-dasharray="6 4" /></svg>Em aberto
      </li>
      <li class="flex items-center gap-1.5">
        <svg aria-hidden="true" width="24" height="4" class="opacity-60"><line x1="0" y1="2" x2="24" y2="2" stroke="var(--muted-foreground)" stroke-width="2" stroke-dasharray="2 4" /></svg>De antes
      </li>
    </ul>
  </div>
{/snippet}

{#snippet body(expanded: boolean)}
  {#if mapState?.error}
    <ErrorState data={{ message: mapState.error }} ui={{ variant: 'inline' }} />
  {:else if !data.id}
    <EmptyState data={{ title: 'Escolha o ponto de partida', description: PICK_HINTS[data.focus] }} ui={{ icon: Network }} />
  {:else if mapState?.isLoading}
    <LoadingState data={{ label: 'Carregando o mapa…' }} />
  {:else if !map || map.nodes.length === 0}
    <EmptyState
      data={{ title: 'Nada ligado a esta escolha', description: 'Nenhum computador, chamado ou peça passou por aqui ainda.' }}
      ui={{ icon: Network }}
    />
  {:else}
    <MapCanvas data={{ map }} ui={{ isExpanded: expanded }} actions={{ onExpand: expanded ? undefined : () => (isExpanded = true) }} />
  {/if}
{/snippet}

<section aria-label="Rastreabilidade" class="flex flex-col gap-3">
  {@render toolbar()}
  {@render body(false)}
  <ExpandableScreen
    data={{ title: 'Rastreabilidade', description: 'Cada caixa leva ao que ela é. Esc fecha.' }}
    state={{ isOpen: isExpanded }}
    actions={{ onClose: () => (isExpanded = false) }}
  >
    <div class="flex h-full flex-col gap-3 p-6">
      {@render toolbar()}
      <div class="min-h-0 flex-1">{@render body(true)}</div>
    </div>
  </ExpandableScreen>
</section>
