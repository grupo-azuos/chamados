<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import MiniStatCard from './azuos-mini-stat-card.svelte';

  const { Story } = defineMeta({ title: 'Cards/AzuosMiniStatCard', component: MiniStatCard });
</script>

<Story name="Default" asChild>
  <MiniStatCard data={{ label: 'Em andamento', value: 12 }} ui={{ tone: 'steel' }} />
</Story>
<Story name="Selected" asChild>
  <MiniStatCard data={{ label: 'Concluído', value: 9 }} ui={{ tone: 'green' }} state={{ isSelected: true }} actions={{ onClick: () => {} }} />
</Story>
<Story name="LongLabel" asChild>
  <MiniStatCard data={{ label: 'Serviço paralisado por falta de documento', value: 2 }} ui={{ tone: 'red' }} />
</Story>
