<!--
  @component
  O MAPA DOS VÍNCULOS (o do Paralegal) — cada tarefa numa ilha só dela: quem cuida (o responsável e
  os participantes, com a foto) → a tarefa → os chamados, computadores, peças e itens do inventário
  que ela toca. A ligação da tarefa EM ABERTO até o que ela toca é tracejada e animada.

  O mapa da equipe inteira é grande demais: ele mostra as tarefas das PESSOAS escolhidas — de
  partida, só a própria pessoa. A escolha e o lugar onde cada ilha foi deixada ficam salvos para
  quem volta (`useTaskMapModel`); "Arrumar de novo" esquece os lugares. O "Mostrar" esconde tipos
  de item. "Expandir" põe o mapa na tela inteira.

  Nada se liga nem se apaga aqui. Cada caixa é um link: a tarefa abre a página dela; o chamado, o
  chamado; o computador, a ficha dele.

  - `data`: `tasks`, `people`, `peopleIds`, `positions`, `now`.
  - `state`: `isLoading`.
  - `actions`: `onPeopleChange`, `onIslandMove`, `onResetLayout`.
-->
<script lang="ts" module>
  import { type TaskLinkKind } from '@template/shared/domain/task-flow.util';
  import { type Task } from '@template/shared/schemas/task.schema';

  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
  import { type TaskMapPositions } from '$lib/utils/task-map.util';

  export type AzuosTaskMapProps = {
    data: {
      tasks: Task[];
      people: AzuosPersonPickerPerson[];
      /** As pessoas escolhidas no mapa; vazio é "todas". */
      peopleIds: string[];
      positions: TaskMapPositions;
      now?: Date;
      /** O começo do endereço da área (`/infra`, `/system`). @default '/infra' */
      base?: string;
      /** Os tipos do módulo (em Sistema, só chamado): o "Mostrar" só oferece estes. @default todos */
      kinds?: readonly TaskLinkKind[];
    };
    state?: { isLoading?: boolean };
    actions: {
      onPeopleChange: (peopleIds: string[]) => void;
      onIslandMove: (taskId: string, position: { x: number; y: number }) => void;
      onResetLayout: () => void;
    };
  };
</script>

<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Network from '@lucide/svelte/icons/network';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import MultiSelectField from '$lib/components/azuos-multi-select-field/azuos-multi-select-field.svelte';
  import PersonMultiPickerField from '$lib/components/azuos-person-multi-picker-field/azuos-person-multi-picker-field.svelte';
  import {
    buildTaskMap,
    mapPeopleOf,
    TASK_MAP_KIND_TOGGLES,
    TASK_MAP_KINDS,
    tasksOfPeople,
  } from '$lib/utils/task-map.util';
  import MapCanvas from './azuos-task-map-canvas.svelte';

  let { data, state: mapState, actions }: AzuosTaskMapProps = $props();

  /* O "Mostrar" é estado de TELA: some ao sair, como no Paralegal. */
  // svelte-ignore state_referenced_locally
  let kinds = $state<TaskLinkKind[]>([...(data.kinds ?? TASK_MAP_KINDS)]);
  let isExpanded = $state(false);

  const shown = $derived(tasksOfPeople(data.tasks, data.peopleIds));
  const map = $derived(buildTaskMap(shown, kinds, data.now, data.positions, data.base));
  const people = $derived(mapPeopleOf(data.tasks, data.people));

  const kindOptions = $derived(
    TASK_MAP_KIND_TOGGLES.filter((item) => !data.kinds || data.kinds.includes(item.kind)).map((item) => ({
      value: item.kind,
      label: item.label,
    })),
  );
</script>

{#snippet toolbar()}
  <div class="flex flex-wrap items-center gap-3">
    <PersonMultiPickerField
      data={{ values: data.peopleIds, people, placeholder: 'Todas as pessoas' }}
      ui={{ ariaLabel: 'Pessoas no mapa', className: 'w-64' }}
      actions={{ onChange: actions.onPeopleChange }}
    />
    <!-- O que entra no mapa é escolha de VÁRIAS opções: o select de marcar do grupo, e não
         pastilhas pintadas de azul (uma ação principal por área). Com um tipo só (Sistema), não
         há o que escolher. -->
    {#if kindOptions.length > 1}
      <MultiSelectField
        data={{ values: kinds, options: kindOptions, placeholder: 'Nada no mapa', noun: 'tipos' }}
        ui={{ ariaLabel: 'Mostrar no mapa', className: 'w-56' }}
        actions={{ onChange: (values) => (kinds = values as TaskLinkKind[]) }}
      />
    {/if}
    <ActionButton
      data={{ label: 'Arrumar de novo' }}
      ui={{ variant: 'ghost', size: 'sm', icon: LayoutGrid }}
      state={{ isDisabled: Object.keys(data.positions).length === 0 }}
      actions={{ onClick: actions.onResetLayout }}
    />
  </div>
{/snippet}

{#snippet body(expanded: boolean)}
  {#if mapState?.isLoading}
    <LoadingState data={{ label: 'Carregando as tarefas…' }} />
  {:else if shown.length === 0}
    <EmptyState
      data={{ title: 'Nenhuma tarefa no mapa', description: 'Escolha outras pessoas ou mude os filtros para ver outras.' }}
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

<section aria-label="Mapa dos vínculos" class="flex flex-col gap-3">
  {@render toolbar()}
  {@render body(false)}
  <ExpandableScreen
    data={{ title: 'Mapa dos vínculos', description: 'Cada caixa leva à tela do que ela é. Esc fecha.' }}
    state={{ isOpen: isExpanded }}
    actions={{ onClose: () => (isExpanded = false) }}
  >
    <div class="flex h-full flex-col gap-3 p-6">
      {@render toolbar()}
      <div class="min-h-0 flex-1">{@render body(true)}</div>
    </div>
  </ExpandableScreen>
</section>
