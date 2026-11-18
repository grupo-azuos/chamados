<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MemoryStick from '@lucide/svelte/icons/memory-stick';

  import ContentCard from './azuos-content-card.svelte';

  const { Story } = defineMeta({ title: 'Cards/AzuosContentCard', component: ContentCard });
</script>

<Story name="Default" asChild>
  <ContentCard data={{ label: 'Computador 01' }} ui={{ tone: 'amber', icon: MemoryStick, className: 'w-64 min-h-44' }}>
    <h3 class="text-sm font-bold">Computador 01</h3>
    <p class="text-muted-foreground text-xs">ANALYZE-D01 · Pouca memória</p>
  </ContentCard>
</Story>
<Story name="HoverColored" asChild>
  <ContentCard data={{ label: 'Computador 02' }} ui={{ tone: 'amber', icon: MemoryStick, isHoverColored: true, className: 'w-64 min-h-44' }}>
    <h3 class="text-sm font-bold">Computador 02</h3>
  </ContentCard>
</Story>
<Story name="WithoutIcon" asChild>
  <ContentCard data={{ label: 'Simples' }} ui={{ className: 'w-64' }}>
    <h3 class="text-sm font-bold">Sem ícone</h3>
  </ContentCard>
</Story>
