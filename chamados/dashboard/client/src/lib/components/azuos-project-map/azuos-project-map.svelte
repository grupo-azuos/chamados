<!--
  @component
  O MAPA DOS PROJETOS — cada sistema numa ilha gigante: o projeto, as issues, os PRs, os merges e
  versões, os chamados (com a issue de cada um) e as tarefas que nasceram deles. O que está em
  aberto tem a linha tracejada e animada; o PR que cita uma issue liga nela.

  "Projetos" escolhe quais aparecem (nenhum é todos); "Mostrar" esconde tipos; "Arrumar de novo"
  esquece onde as ilhas foram deixadas; "Expandir" põe o mapa na tela inteira. Cada caixa leva ao
  que ela é: o GitHub em nova aba, o chamado e a tarefa na tela deles.

  - `data`: `entries`, `projects` (as opções), `projectIds`, `positions`.
  - `state`: `isLoading`, `error`.
  - `actions`: `onProjectsChange`, `onIslandMove`, `onResetLayout`.
-->
<script lang="ts" module>
  import { type ProjectMapEntry } from '@template/shared/schemas/project-map.schema';

  import { type ProjectMapPositions } from '$lib/utils/project-map.util';

  export type AzuosProjectMapProps = {
    data: {
      entries: ProjectMapEntry[];
      projects: { id: number; name: string }[];
      /** Os sistemas escolhidos; vazio é todos. */
      projectIds: string[];
      positions: ProjectMapPositions;
    };
    state?: { isLoading?: boolean; error?: string | null };
    actions: {
      onProjectsChange: (projectIds: string[]) => void;
      onIslandMove: (projectId: string, position: { x: number; y: number }) => void;
      onResetLayout: () => void;
    };
  };
</script>

<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Network from '@lucide/svelte/icons/network';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import ExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import MultiSelectField from '$lib/components/azuos-multi-select-field/azuos-multi-select-field.svelte';
  import {
    buildProjectMap,
    PROJECT_MAP_KIND_TOGGLES,
    PROJECT_MAP_KINDS,
    type ProjectMapKind,
  } from '$lib/utils/project-map.util';
  import MapCanvas from './azuos-project-map-canvas.svelte';

  let { data, state: mapState, actions }: AzuosProjectMapProps = $props();

  /* O "Mostrar" é estado de TELA: some ao sair, como no mapa das tarefas. */
  let kinds = $state<ProjectMapKind[]>([...PROJECT_MAP_KINDS]);
  let isExpanded = $state(false);

  const map = $derived(buildProjectMap(data.entries, kinds, data.positions));
  const options = $derived(data.projects.map((project) => ({ value: String(project.id), label: project.name })));

  function toggle(kind: ProjectMapKind) {
    kinds = kinds.includes(kind) ? kinds.filter((item) => item !== kind) : [...kinds, kind];
  }
</script>

{#snippet toolbar()}
  <div class="flex flex-wrap items-center gap-3">
    <MultiSelectField
      data={{ values: data.projectIds, options, placeholder: 'Todos os projetos', noun: 'projetos' }}
      ui={{ ariaLabel: 'Projetos no mapa', className: 'w-64' }}
      actions={{ onChange: actions.onProjectsChange }}
    />
    <div role="group" aria-label="Mostrar no mapa" class="flex flex-wrap items-center gap-2">
      <span class="text-muted-foreground text-sm font-medium">Mostrar</span>
      {#each PROJECT_MAP_KIND_TOGGLES as item (item.kind)}
        <ActionButton
          data={{ label: item.label }}
          ui={{ variant: kinds.includes(item.kind) ? 'primary' : 'secondary', size: 'sm' }}
          state={{ isPressed: kinds.includes(item.kind) }}
          actions={{ onClick: () => toggle(item.kind) }}
        />
      {/each}
    </div>
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
