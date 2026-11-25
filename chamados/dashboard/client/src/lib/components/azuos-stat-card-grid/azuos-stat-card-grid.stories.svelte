<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import { type AzuosCardTone as StatCardTone } from '$lib/utils/card-tone.util';
  import StatCardGrid from './azuos-stat-card-grid.svelte';

  const summary: { label: string; value: number; tone: StatCardTone }[] = [
    { label: 'Abertos', value: 42, tone: 'brand' },
    { label: 'Em atendimento', value: 17, tone: 'info' },
    { label: 'Aguardando', value: 9, tone: 'warning' },
    { label: 'Atrasados', value: 4, tone: 'danger' },
    { label: 'Resolvidos', value: 128, tone: 'success' },
    { label: 'Cancelados', value: 3, tone: 'neutral' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosStatCardGrid',
    component: StatCardGrid,
  });
</script>

<!-- A grade só existe para arrumar os cartões; as histórias mostram como ela se comporta
     conforme o número deles muda. -->
<Story name="Default">
  {#snippet template()}
    <StatCardGrid>
      <ContentCard data={{ label: 'Clientes', title: 'Clientes', highlight: { value: 560 } }} ui={{ iconTone: 'brand' }} />
      <ContentCard data={{ label: 'Concluídas', title: 'Concluídas', highlight: { value: 145 } }} ui={{ iconTone: 'success' }} />
      <ContentCard data={{ label: 'Vencendo', title: 'Vencendo', highlight: { value: 27 } }} ui={{ iconTone: 'warning' }} />
      <ContentCard data={{ label: 'Vencidos', title: 'Vencidos', highlight: { value: 23 } }} ui={{ iconTone: 'danger' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: um cartão só não pode esticar para a largura inteira. -->
<Story name="SingleCard (edge case)">
  {#snippet template()}
    <StatCardGrid>
      <ContentCard data={{ label: 'Total geral', title: 'Total geral', highlight: { value: 1708 } }} ui={{ iconTone: 'brand' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: mais de quatro cartões escritos na tela quebram para a linha de baixo. Em
     lista (`data.items`), a mesma fileira vira faixa — ver "SlidingStrip". -->
<Story name="SecondRow (edge case)">
  {#snippet template()}
    <StatCardGrid>
      <ContentCard data={{ label: 'Clientes', title: 'Clientes', highlight: { value: 560 } }} ui={{ iconTone: 'brand' }} />
      <ContentCard data={{ label: 'Concluídas', title: 'Concluídas', highlight: { value: 145 } }} ui={{ iconTone: 'success' }} />
      <ContentCard data={{ label: 'Vencendo', title: 'Vencendo', highlight: { value: 27 } }} ui={{ iconTone: 'warning' }} />
      <ContentCard data={{ label: 'Vencidos', title: 'Vencidos', highlight: { value: 23 } }} ui={{ iconTone: 'danger' }} />
      <ContentCard data={{ label: 'Em andamento', title: 'Em andamento', highlight: { value: 59 } }} ui={{ iconTone: 'info' }} />
      <ContentCard data={{ label: 'Não iniciado', title: 'Não iniciado', highlight: { value: 79 } }} ui={{ iconTone: 'neutral' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: passou de quatro cartões em lista, a fileira vira faixa que desliza. -->
<Story name="SlidingStrip (edge case)">
  {#snippet template()}
    <StatCardGrid data={{ items: summary }} ui={{ ariaLabel: 'Resumo dos chamados' }}>
      {#snippet card(entry)}
        <ContentCard data={{ label: entry.label, title: entry.label, highlight: { value: entry.value } }} ui={{ iconTone: entry.tone }} />
      {/snippet}
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: sem cartão nenhum a grade não desenha caixa vazia. -->
<Story name="Empty (edge case)">
  {#snippet template()}
    <StatCardGrid />
  {/snippet}
</Story>
