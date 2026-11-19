<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import StatCard, { type StatCardTone } from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
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
      <StatCard data={{ label: 'Clientes', value: 560 }} ui={{ tone: 'brand' }} />
      <StatCard data={{ label: 'Concluídas', value: 145 }} ui={{ tone: 'success' }} />
      <StatCard data={{ label: 'Vencendo', value: 27 }} ui={{ tone: 'warning' }} />
      <StatCard data={{ label: 'Vencidos', value: 23 }} ui={{ tone: 'danger' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: um cartão só não pode esticar para a largura inteira. -->
<Story name="SingleCard (edge case)">
  {#snippet template()}
    <StatCardGrid>
      <StatCard data={{ label: 'Total geral', value: 1708 }} ui={{ tone: 'brand' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: mais de quatro cartões escritos na tela quebram para a linha de baixo. Em
     lista (`data.items`), a mesma fileira vira faixa — ver "SlidingStrip". -->
<Story name="SecondRow (edge case)">
  {#snippet template()}
    <StatCardGrid>
      <StatCard data={{ label: 'Clientes', value: 560 }} ui={{ tone: 'brand' }} />
      <StatCard data={{ label: 'Concluídas', value: 145 }} ui={{ tone: 'success' }} />
      <StatCard data={{ label: 'Vencendo', value: 27 }} ui={{ tone: 'warning' }} />
      <StatCard data={{ label: 'Vencidos', value: 23 }} ui={{ tone: 'danger' }} />
      <StatCard data={{ label: 'Em andamento', value: 59 }} ui={{ tone: 'info' }} />
      <StatCard data={{ label: 'Não iniciado', value: 79 }} ui={{ tone: 'neutral' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: passou de quatro cartões em lista, a fileira vira faixa que desliza. -->
<Story name="SlidingStrip (edge case)">
  {#snippet template()}
    <StatCardGrid data={{ items: summary }} ui={{ ariaLabel: 'Resumo dos chamados' }}>
      {#snippet card(entry)}
        <StatCard data={{ label: entry.label, value: entry.value }} ui={{ tone: entry.tone }} />
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
