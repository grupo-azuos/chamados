<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CardSurface from './azuos-card-surface.svelte';

  const { Story } = defineMeta({
    title: 'Cards/AzuosCardSurface (base do card de conteúdo)',
    component: CardSurface,
  });
</script>

<Story name="Default" asChild>
  <CardSurface data={{ label: 'Card' }}><p class="p-5 text-sm">Conteúdo do card</p></CardSurface>
</Story>
<Story name="Clickable" asChild>
  <CardSurface data={{ label: 'Card' }} actions={{ onClick: () => {} }}>
    <p class="p-5 text-sm">Clicável: no hover nada se mexe, só o cursor muda</p>
  </CardSurface>
</Story>
<Story name="Selected" asChild>
  <CardSurface data={{ label: 'Card' }} state={{ isSelected: true }} actions={{ onClick: () => {} }}>
    <p class="p-5 text-sm">Escolhido</p>
  </CardSurface>
</Story>
