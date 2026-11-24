<script lang="ts">
  import { page } from '$app/state';
  import BackButton from '$lib/components/azuos-back-button/azuos-back-button.svelte';
  import ProjectMap from '$lib/components/azuos-project-map/azuos-project-map.svelte';
  import { useSupportSystemMapModel } from '$lib/hooks/use-support-system-map/use-support-system-map.svelte';

  /**
   * O MAPA DE UM SISTEMA NA CENTRAL — quem pede chamado vê o sistema inteiro: os commits, as
   * issues, os PRs, os chamados e as tarefas. Ver o que já está em andamento evita o chamado
   * repetido.
   *
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   */
  const map = useSupportSystemMapModel(Number(page.params.id));
</script>

<svelte:head>
  <title>Mapa do sistema — Central de Chamados TI</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
  <BackButton data={{ destination: 'os sistemas', to: '/support/systems' }} />
  <header class="flex flex-col gap-1">
    <h1 class="text-foreground text-2xl font-bold">{map.data.name ?? 'Mapa do sistema'}</h1>
    <p class="text-muted-foreground text-sm">
      O que está em andamento no sistema: os commits, as issues, os pull requests, os chamados e as tarefas.
    </p>
  </header>
  <ProjectMap data={map.data} ui={{ isCentral: true }} state={map.state} actions={map.actions} />
</main>
