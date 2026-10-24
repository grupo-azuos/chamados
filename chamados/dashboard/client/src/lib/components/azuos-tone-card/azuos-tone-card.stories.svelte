<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ToneCard from './azuos-tone-card.svelte';

  const { Story } = defineMeta({ title: 'Superfícies/AzuosToneCard', component: ToneCard });
</script>

<Story name="Static" asChild>
  <ToneCard data={{ label: 'Vencidos' }} ui={{ tone: 'danger' }}>Vencidos: 3</ToneCard>
</Story>
<Story name="Interactive" asChild>
  <ToneCard data={{ label: 'Em dia' }} ui={{ tone: 'success', mode: 'interactive' }}>Em dia: 8</ToneCard>
</Story>
<Story name="Selected" asChild>
  <ToneCard data={{ label: 'Todos' }} ui={{ tone: 'brand', mode: 'interactive' }} state={{ isSelected: true }}>Todos: 12</ToneCard>
</Story>
