<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import HardDrive from '@lucide/svelte/icons/hard-drive';

  import CardSurface from './azuos-card-surface.svelte';

  const { Story } = defineMeta({ title: 'Cards/AzuosCardSurface', component: CardSurface });
</script>

<Story name="Default" asChild>
  <CardSurface data={{ label: 'Card' }}><p class="p-5 text-sm">Conteúdo do card</p></CardSurface>
</Story>
<Story name="Clickable" asChild>
  <CardSurface data={{ label: 'Card' }} actions={{ onClick: () => {} }}>
    <p class="p-5 text-sm">Hover: sobe 2px, a sombra cresce e o véu é neutro</p>
  </CardSurface>
</Story>
<Story name="WithMark" asChild>
  <CardSurface data={{ label: 'Card' }} ui={{ mark: HardDrive, markTone: 'red', className: 'min-h-40' }}>
    <p class="p-5 text-sm">Ícone grande no canto</p>
  </CardSurface>
</Story>
<Story name="Selected" asChild>
  <CardSurface data={{ label: 'Card' }} state={{ isSelected: true }} actions={{ onClick: () => {} }}>
    <p class="p-5 text-sm">Escolhido</p>
  </CardSurface>
</Story>
