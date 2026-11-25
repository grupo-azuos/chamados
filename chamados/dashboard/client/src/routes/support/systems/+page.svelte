<script lang="ts">
  import SupportSystemsView from '../components/azuos-support-systems-view/azuos-support-systems-view.svelte';
  import { useSupportSystemsModel } from '$lib/hooks/use-support-systems/use-support-systems.svelte';

  /**
   * O ANDAMENTO DOS SISTEMAS na Central — quem pede chamado vê o que já está em curso em cada
   * sistema, e o card abre o mapa completo dele.
   *
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   */
  const systems = useSupportSystemsModel();
</script>

<svelte:head>
  <title>Sistemas — Central de Chamados TI</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
  <SupportSystemsView data={systems.data} state={systems.state} actions={systems.actions} />
</main>
