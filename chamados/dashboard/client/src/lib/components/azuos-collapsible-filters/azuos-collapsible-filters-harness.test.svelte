<script lang="ts">
  /**
   * O cartão recebe o que mostra por snippet — e snippet só se escreve dentro de um componente.
   * Este casulo monta um cartão pequeno para o teste olhar.
   */
  import CollapsibleFilters from './azuos-collapsible-filters.svelte';

  let {
    activeCount = 0,
    hasFilter = false,
    hasMore = true,
    onClear = () => {},
  }: { activeCount?: number; hasFilter?: boolean; hasMore?: boolean; onClear?: () => void } = $props();
</script>

{#snippet primary()}
  <input aria-label="Buscar" />
{/snippet}

{#snippet more()}
  <input aria-label="Categoria" />
{/snippet}

<CollapsibleFilters
  data={{ label: 'Filtros das peças', activeCount }}
  state={{ hasFilter }}
  actions={{ onClear }}
  {primary}
  children={hasMore ? more : undefined}
/>
