<!--
  @component
  O MAPA DOS PROJETOS — cada sistema numa ilha gigante: o git graph (os commits, as branches na cor
  do git-flow), o projeto, as issues, os PRs, os merges e versões, os chamados (com a issue de cada
  um) e as tarefas que nasceram deles. O que está em
  aberto tem a linha tracejada e animada; o PR que cita uma issue liga nela.

  "Projetos" escolhe quais aparecem (nenhum é todos); "Período" e "Responsável" recortam tudo,
  inclusive o git graph (a pessoa pelos commits da conta do GitHub dela); "Só merges e branches"
  tira do grafo os commits do meio; "Mostrar" esconde tipos; "Arrumar de novo"
  esquece onde as ilhas foram deixadas; "Expandir" põe o mapa na tela inteira. Cada caixa leva ao
  que ela é: o GitHub em nova aba, o chamado e a tarefa na tela deles.

  - `data`: `entries`, `projects` (as opções), `projectIds`, `positions`, `period`, `personId`,
    `people`, `personLogin`, `onlyMerges`.
  - `state`: `isLoading`, `error`.
  - `actions`: `onProjectsChange`, `onIslandMove`, `onResetLayout`, `onPeriodChange`,
    `onPersonChange`, `onOnlyMergesChange`.
-->
<script lang="ts" module>
  import { type ProjectMapEntry } from '@template/shared/schemas/project-map.schema';

  import { type AzuosDateRange } from '$lib/components/azuos-date-range-field/azuos-date-range-field.svelte';
  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import { type ProjectMapPositions } from '$lib/utils/project-map.util';

  export type AzuosProjectMapProps = {
    data: {
      entries: ProjectMapEntry[];
      projects: { id: number; name: string }[];
      /** Os sistemas escolhidos; vazio é todos. */
      projectIds: string[];
      positions: ProjectMapPositions;
      period: AzuosDateRange;
      /** A pessoa do filtro; vazio é todo mundo. */
      personId: string;
      people: AzuosPersonPickerPerson[];
      /** A conta do GitHub da pessoa do filtro (os commits dela); nula sem conta vinculada. */
      personLogin: string | null;
      onlyMerges: boolean;
    };
    /**
     * `isCentral`: o mapa de UM sistema na Central, para quem pede chamado — sem o "Projetos", e o
     * chamado e a tarefa não levam ao painel (que é do time); o GitHub continua abrindo.
     */
    ui?: { isCentral?: boolean };
    state?: { isLoading?: boolean; error?: string | null };
    actions: {
      onProjectsChange: (projectIds: string[]) => void;
      onIslandMove: (projectId: string, position: { x: number; y: number }) => void;
      onResetLayout: () => void;
      onPeriodChange: (period: AzuosDateRange) => void;
      onPersonChange: (personId: string) => void;
      onOnlyMergesChange: (onlyMerges: boolean) => void;
    };
  };
</script>

<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Network from '@lucide/svelte/icons/network';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import DateRangeField from '$lib/components/azuos-date-range-field/azuos-date-range-field.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import ExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import MultiSelectField from '$lib/components/azuos-multi-select-field/azuos-multi-select-field.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import {
    buildProjectMap,
    type ProjectMapGraph,
    PROJECT_MAP_KIND_TOGGLES,
    PROJECT_MAP_KINDS,
    type ProjectMapKind,
  } from '$lib/utils/project-map.util';
  import MapCanvas from './azuos-project-map-canvas.svelte';

  let { data, ui, state: mapState, actions }: AzuosProjectMapProps = $props();

  /* O "Mostrar" é estado de TELA: some ao sair, como no mapa das tarefas. */
  let kinds = $state<ProjectMapKind[]>([...PROJECT_MAP_KINDS]);
  let isExpanded = $state(false);

  const built = $derived(
    buildProjectMap(data.entries, kinds, data.positions, {
      from: data.period.from ?? undefined,
      to: data.period.to ?? undefined,
      isPersonFiltered: data.personId !== '',
      personLogin: data.personLogin,
      onlyMerges: data.onlyMerges,
    }),
  );
  const map = $derived(ui?.isCentral ? withoutPanelLinks(built) : built);

  function withoutPanelLinks(graph: ProjectMapGraph): ProjectMapGraph {
    return {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.type === 'item' && !node.data.isExternal ? { ...node, data: { ...node.data, href: null } } : node,
      ),
    };
  }
  const options = $derived(data.projects.map((project) => ({ value: String(project.id), label: project.name })));

  const KIND_OPTIONS = PROJECT_MAP_KIND_TOGGLES.map((item) => ({ value: item.kind, label: item.label }));
  const COMMIT_OPTIONS = [
    { value: 'all', label: 'Todos os commits' },
    { value: 'merges', label: 'Só merges e branches' },
  ];
</script>

{#snippet toolbar()}
  <!-- Pela base: o "Período" tem rótulo em cima, e os outros campos se alinham à caixa dele. -->
  <div class="flex flex-wrap items-end gap-3">
    {#if !ui?.isCentral}
      <MultiSelectField
        data={{ values: data.projectIds, options, placeholder: 'Todos os projetos', noun: 'projetos' }}
        ui={{ ariaLabel: 'Projetos no mapa', className: 'w-64' }}
        actions={{ onChange: actions.onProjectsChange }}
      />
    {/if}
    <DateRangeField
      data={{ label: 'Período', name: 'mapPeriod', value: data.period }}
      ui={{ placeholder: 'Todo o período', className: 'w-64' }}
      actions={{ onChange: actions.onPeriodChange }}
    />
    <PersonPickerField
      data={{ value: data.personId, people: data.people, leading: [{ value: '', label: 'Todos os responsáveis' }] }}
      ui={{ ariaLabel: 'Responsável', placeholder: 'Todos os responsáveis', className: 'w-64' }}
      actions={{ onChange: actions.onPersonChange }}
    />
    <!-- Recorte de uma escolha: a pílula cinza do grupo, com a ligada em branco. -->
    <SegmentedControl
      data={{ value: data.onlyMerges ? 'merges' : 'all', options: COMMIT_OPTIONS }}
      ui={{ ariaLabel: 'Commits no mapa' }}
      actions={{ onChange: (value: string) => actions.onOnlyMergesChange(value === 'merges') }}
    />
    <!-- O que entra no mapa é escolha de VÁRIAS opções: o select de marcar, e não pastilhas azuis. -->
    <MultiSelectField
      data={{ values: kinds, options: KIND_OPTIONS, placeholder: 'Nada no mapa', noun: 'tipos' }}
      ui={{ ariaLabel: 'Mostrar no mapa', className: 'w-56' }}
      actions={{ onChange: (values) => (kinds = values as ProjectMapKind[]) }}
    />
    <ActionButton
      data={{ label: 'Arrumar de novo' }}
      ui={{ variant: 'ghost', size: 'sm', icon: LayoutGrid }}
      state={{ isDisabled: Object.keys(data.positions).length === 0 }}
      actions={{ onClick: actions.onResetLayout }}
    />
  </div>
{/snippet}

{#snippet body(expanded: boolean)}
  {#if mapState?.error}
    <ErrorState data={{ message: mapState.error }} ui={{ variant: 'inline' }} />
  {:else if mapState?.isLoading}
    <LoadingState data={{ label: 'Carregando o mapa dos projetos…' }} />
  {:else if data.entries.length === 0}
    <EmptyState
      data={{ title: 'Nenhum projeto no mapa', description: 'Escolha outros projetos para ver o mapa deles.' }}
      ui={{ icon: Network }}
    />
  {:else}
    <MapCanvas
      data={{ map }}
      ui={{ isExpanded: expanded }}
      actions={{ onIslandMove: actions.onIslandMove, onExpand: expanded ? undefined : () => (isExpanded = true) }}
    />
  {/if}
{/snippet}

<section aria-label="Mapa dos projetos" class="flex flex-col gap-3">
  {@render toolbar()}
  {@render body(false)}
  <ExpandableScreen
    data={{ title: 'Mapa dos projetos', description: 'Cada caixa leva ao que ela é. Esc fecha.' }}
    state={{ isOpen: isExpanded }}
    actions={{ onClose: () => (isExpanded = false) }}
  >
    <div class="flex h-full flex-col gap-3 p-6">
      {@render toolbar()}
      <div class="min-h-0 flex-1">{@render body(true)}</div>
    </div>
  </ExpandableScreen>
</section>
