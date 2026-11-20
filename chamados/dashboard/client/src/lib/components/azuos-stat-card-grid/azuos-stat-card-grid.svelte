<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /** Quatro cartões por linha é o limite do que se compara de relance. */
  export const STAT_CARD_GRID_MAX_COLUMNS = 4;

  export type AzuosStatCardGridProps<T> = {
    /** Os cartões como lista, desenhados por `card`: é o que deixa a fileira virar faixa. */
    data?: { items: T[] };
    /** `ariaLabel`: o nome da faixa para o leitor de tela, quando ela desliza. */
    ui?: { className?: string; ariaLabel?: string };
    card?: Snippet<[T, number]>;
    /** Cartões fixos, escritos na tela: ficam sempre na grade. */
    children?: Snippet;
  };
</script>

<script lang="ts" generics="T">
  /**
   * A fileira de cartões do topo do painel.
   *
   * Existe como componente, e não como uma `class` repetida em cada tela, porque o número de
   * colunas é uma decisão de leitura, não de layout: quatro cartões por linha é o limite do
   * que se compara de relance, e abaixo disso a fileira vira uma lista que ninguém varre.
   * Repetida à mão, essa decisão se perde na primeira tela nova.
   *
   * Por isso, PASSOU DE QUATRO, a fileira vira faixa que desliza (`AzuosCarousel`): continua uma
   * linha só, com o resto a um arraste ou a uma seta — e não três linhas de cartões empurrando a
   * lista para baixo da dobra. No Svelte não dá para contar os filhos de um snippet: a faixa só
   * existe quando os cartões vêm como lista (`data.items` + `card`).
   */
  import Carousel from '$lib/components/azuos-carousel/azuos-carousel.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, card, children }: AzuosStatCardGridProps<T> = $props();

  const items = $derived(data?.items ?? []);
  const isStrip = $derived(Boolean(card) && items.length > STAT_CARD_GRID_MAX_COLUMNS);
</script>

{#if isStrip && card}
  <Carousel
    data={{ items }}
    ui={{ ariaLabel: ui?.ariaLabel ?? 'Cartões', itemClassName: 'basis-1/2 lg:basis-1/4', className: ui?.className }}
    item={card}
  />
{:else}
  <div class={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', ui?.className)}>{#if card}{#each items as entry, index (index)}{@render card(entry, index)}{/each}{/if}{@render children?.()}</div>
{/if}
