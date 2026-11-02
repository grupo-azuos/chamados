<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import AArrowDown from '@lucide/svelte/icons/a-arrow-down';
  import AArrowUp from '@lucide/svelte/icons/a-arrow-up';

  import SliderField from './azuos-slider-field.svelte';

  const data = { label: 'Tamanho do texto', value: 14, min: 12, max: 20, step: 1 };

  const { Story } = defineMeta({
    title: 'Components/AzuosSliderField',
    component: SliderField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data }} />

<!-- Com os ícones nas pontas. -->
<Story name="WithIcons" asChild>
  <SliderField {data}>
    {#snippet startIcon()}<AArrowDown class="text-muted-foreground size-4" aria-hidden="true" />{/snippet}
    {#snippet endIcon()}<AArrowUp class="text-muted-foreground size-4" aria-hidden="true" />{/snippet}
  </SliderField>
</Story>

<Story name="Disabled" args={{ data, state: { isDisabled: true } }} />
