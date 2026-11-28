<!--
  @component
  A célula da COLUNA DE AÇÕES da `AzuosTable`: estreita, numa linha só, PRESA À DIREITA
  (`table-sticky-end`, em `tokens.css`) — na tabela larga que rola para o lado, o menu da linha
  continua à vista, com o fundo do card e o véu da linha no hover. O clique nela não chega à linha
  clicável.

  Recebe as mesmas props do `TableCell` do `ui/table`; os botões vão em `children`.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import TableActions from './azuos-table-actions.svelte';
  import TableCell from './azuos-table-cell.svelte';
  import { cn } from '$lib/utils/cn';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: ComponentProps<typeof TableCell> = $props();

  /* A linha que abre o registro no clique não abre junto com a ação: o clique e a tecla na coluna
     de ações ficam nela. */
  function stop(event: Event) {
    event.stopPropagation();
  }
</script>

<TableCell
  bind:ref
  data-slot="table-actions-cell"
  class={cn('table-sticky-end w-px py-1 text-right whitespace-nowrap', className)}
  onclick={stop}
  onkeydown={stop}
  {...restProps}
>
  <TableActions>{@render children?.()}</TableActions>
</TableCell>
