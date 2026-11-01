<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ColorSwatchField from './azuos-color-swatch-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosColorSwatchField',
    component: ColorSwatchField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Random" args={{ data: { value: '' }, actions: { onChange: () => {} } }} />

<Story name="PaletteColor" args={{ data: { value: '#047857' }, actions: { onChange: () => {} } }} />

<!-- Uma cor fora da paleta, escolhida pelo seletor do navegador. -->
<Story name="CustomColor" args={{ data: { value: '#0e7490' }, actions: { onChange: () => {} } }} />

<Story name="Required" args={{ data: { value: '#2563eb' }, ui: { allowRandom: false, ariaLabel: 'Cor da tag' }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { value: '#2563eb' }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />
