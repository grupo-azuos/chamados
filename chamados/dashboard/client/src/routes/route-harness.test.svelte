<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Component } from 'svelte';

  /**
   * Uma rota só existe dentro do SvelteKit, que lhe dá o QueryClient e os dados da sessão.
   * Este apoio faz o papel dele nos testes: monta a página com o QueryClient no contexto e
   * entrega as props que o `load` entregaria.
   */
  let { component, props = {} }: { component: Component<never>; props?: Record<string, unknown> } =
    $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  const Page = component as Component<Record<string, unknown>>;
</script>

<Page {...props} />
