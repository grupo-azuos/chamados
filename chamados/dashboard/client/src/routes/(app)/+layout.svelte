<script lang="ts">
  import type { Snippet } from 'svelte';

  import { useNavigationStackRecorder } from '$lib/hooks/use-navigation-stack/use-navigation-stack.svelte';

  /**
   * AQUI NÃO SE DESENHA CASCA NENHUMA — de propósito.
   *
   * Este grupo só existe pela guarda de sessão em `+layout.ts`: quando qualquer coisa daqui
   * para baixo roda, a sessão já foi conferida.
   *
   * O menu lateral é de CADA MÓDULO: `infra/+layout.svelte`, `system/+layout.svelte` e
   * `maintenance/+layout.svelte` montam a própria casca, cada um com a própria lista de menu
   * (ver `lib/navigation/navigation.ts`); o perfil e os cargos, que não são de contexto
   * nenhum, usam a casca de `(account)/+layout.svelte`.
   *
   * Antes a casca era UMA, montada aqui, e ela decidia o menu filtrando uma lista única pelo
   * contexto guardado no navegador. Era o que fazia um módulo se achar dono do sistema
   * inteiro. Uma casca aqui voltaria a envolver os três — e os layouts de baixo não têm como
   * tirá-la.
   */
  let { children }: { children: Snippet } = $props();

  /* A pilha do "voltar" é gravada aqui, uma vez, para as telas logadas dos três módulos. */
  useNavigationStackRecorder();
</script>

{@render children()}
