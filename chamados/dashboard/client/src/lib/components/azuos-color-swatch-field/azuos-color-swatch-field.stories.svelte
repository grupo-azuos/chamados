<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { themeColor } from '$lib/utils/theme-color.util';

  import ColorSwatchField from './azuos-color-swatch-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosColorSwatchField',
    component: ColorSwatchField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Random" args={{ data: { value: '' }, actions: { onChange: () => {} } }} />

<Story name="PaletteColor" args={{ data: { value: themeColor('--success') }, actions: { onChange: () => {} } }} />

<!-- Uma cor fora da paleta, escolhida pelo seletor do navegador. -->
<Story name="CustomColor" args={{ data: { value: themeColor('--brand-blue-900') }, actions: { onChange: () => {} } }} />

<Story name="Required" args={{ data: { value: themeColor('--brand-blue-600') }, ui: { allowRandom: false, ariaLabel: 'Cor da tag' }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { value: themeColor('--brand-blue-600') }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
