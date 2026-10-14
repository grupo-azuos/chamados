<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import BrandMark from './azuos-brand-mark.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBrandMark',
    component: BrandMark,
    parameters: { layout: 'padded' },
  });
</script>

<!-- A logo branca inteira, sobre a barra azul: é onde ela vive no sistema. -->
<Story name="Default">
  <div class="bg-sidebar rounded-box p-4">
    <BrandMark />
  </div>
</Story>

<!-- Pequena: é a do topo da barra lateral aberta. -->
<Story name="Small">
  <div class="bg-sidebar rounded-box p-4">
    <BrandMark ui={{ size: 'sm' }} />
  </div>
</Story>

<!-- Só o símbolo: a barra recolhida. -->
<Story name="Icon">
  <div class="bg-sidebar rounded-box inline-flex p-2">
    <BrandMark ui={{ variant: 'icon', size: 'sm' }} />
  </div>
</Story>

<!-- O ícone de app: telas de fundo claro, como a de entrar. -->
<Story name="Tile" args={{ ui: { variant: 'tile', size: 'lg' } }} />

<!-- Caso limite: a logo branca sobre fundo claro some — por isso as telas claras usam `tile`. -->
<Story name="WhiteOnLight" args={{ ui: { size: 'lg' } }} />
