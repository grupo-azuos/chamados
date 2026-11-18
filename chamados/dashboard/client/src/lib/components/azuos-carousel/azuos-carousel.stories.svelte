<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Carousel from './azuos-carousel.svelte';

  const situations = ['Abertos', 'Aguardando', 'Em andamento', 'Resolvidos', 'Cancelados', 'Reabertos'];

  const { Story } = defineMeta({
    title: 'Components/AzuosCarousel',
    component: Carousel,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" asChild>
  <Carousel data={{ items: situations }} ui={{ ariaLabel: 'Resumo por situação', itemClassName: 'basis-1/2 lg:basis-1/4' }}>
    {#snippet item(label, index)}
      <div class="bg-card border-border rounded-surface border p-4">
        <p class="text-muted-foreground text-xs">{label}</p>
        <p class="text-2xl font-bold">{index * 3 + 2}</p>
      </div>
    {/snippet}
  </Carousel>
</Story>

<!-- Caso limite: poucos itens, tudo cabe — as setas ficam desligadas. -->
<Story name="FewItems" asChild>
  <Carousel data={{ items: situations.slice(0, 2) }} ui={{ ariaLabel: 'Resumo', itemClassName: 'basis-1/3' }}>
    {#snippet item(label)}
      <div class="bg-card border-border rounded-surface border p-4">{label}</div>
    {/snippet}
  </Carousel>
</Story>
