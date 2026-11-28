<!--
  @component
  O cabeçalho da COLUNA DE AÇÕES da `AzuosTable`: estreito (`w-px`, a largura do que cabe), preso à
  direita e sem texto à vista — "Ações" fica para o leitor de tela. Uma coluna de ação com título
  visível e largura própria era o que alargava a tabela.

  Recebe as mesmas props do `TableHead` do `ui/table`; sem `children`, o "Ações" escondido.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import TableHead from './azuos-table-head.svelte';
  import { cn } from '$lib/utils/cn';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: ComponentProps<typeof TableHead> = $props();
</script>

<TableHead
  bind:ref
  data-slot="table-actions-head"
  class={cn('table-sticky-end w-px text-right', className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <span class="sr-only">Ações</span>
  {/if}
</TableHead>
