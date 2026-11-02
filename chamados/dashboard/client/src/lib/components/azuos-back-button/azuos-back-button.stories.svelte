<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import BackButton from './azuos-back-button.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBackButton',
    component: BackButton,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { destination: 'os projetos', to: '#' } }} />

<!-- Sem destino: só "Voltar", e volta pelo histórico. -->
<Story name="WithoutDestination" args={{ data: {} }} />

<Story name="Disabled" args={{ data: { destination: 'os chamados' }, state: { isDisabled: true } }} />

<!-- Caso limite: destino comprido num celular. -->
<Story name="LongDestinationOnPhone" asChild>
  <div class="w-[320px]">
    <BackButton data={{ destination: 'as manutenções preventivas planejadas do mês', to: '#' }} />
  </div>
</Story>
