<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import LoadingState from './azuos-loading-state.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosLoadingState',
    component: LoadingState,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { label: 'Carregando os chamados…' } }} />

<!-- Compacto, dentro de um painel pequeno. -->
<Story name="Compact" args={{ data: { label: 'Carregando…' }, ui: { className: 'py-4' } }} />

<!-- Caso limite: legenda comprida na largura de um celular. -->
<Story name="LongLabelOnPhone">
  <div class="w-[320px]">
    <LoadingState data={{ label: 'Carregando o histórico completo de manutenções da máquina…' }} />
  </div>
</Story>
