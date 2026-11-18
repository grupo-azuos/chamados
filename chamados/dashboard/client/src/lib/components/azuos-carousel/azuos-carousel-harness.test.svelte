<script lang="ts">
  /** O carrossel desenha cada item por snippet — que um teste não passa por `props`. */
  import Carousel from './azuos-carousel.svelte';

  let { items }: { items: string[] } = $props();
</script>

<Carousel data={{ items }} ui={{ ariaLabel: 'Resumo por situação', itemClassName: 'basis-1/3' }}>
  {#snippet item(label)}
    <article>{label}</article>
  {/snippet}
</Carousel>
