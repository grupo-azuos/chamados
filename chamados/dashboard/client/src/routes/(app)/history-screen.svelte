<script lang="ts" module>
  import { type RoleContext } from '@template/shared/domain/role-context.util';

  /**
   * O HISTÓRICO de um módulo — a mesma composição nos três (`/infra/history`, `/system/history`,
   * `/maintenance/history`), que só mudam o módulo. Mora aqui, uma vez, como a fila de chamados.
   */
  export type HistoryScreenProps = { module: RoleContext };
</script>

<script lang="ts">
  import HistoryView from '$lib/components/azuos-history-view/azuos-history-view.svelte';
  import { useHistoryModel } from '$lib/hooks/use-history/use-history.svelte';

  let { module }: HistoryScreenProps = $props();

  /* Só compõe: o model e a view (CONTRIBUTING §3). O módulo não muda enquanto a tela vive. */
  // svelte-ignore state_referenced_locally
  const history = useHistoryModel(module);
</script>

<HistoryView data={history.data} state={history.state} actions={history.actions} />
