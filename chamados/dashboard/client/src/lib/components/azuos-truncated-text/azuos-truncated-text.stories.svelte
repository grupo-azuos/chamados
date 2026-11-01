<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TruncatedText from './azuos-truncated-text.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTruncatedText',
    component: TruncatedText,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Passe o mouse: o texto inteiro aparece no balão. -->
<Story name="Clipped">
  <div class="w-40">
    <TruncatedText
      data={{ text: 'Troca da fonte da impressora do financeiro' }}
      ui={{ className: 'truncate' }}
    />
  </div>
</Story>

<!-- Cabe inteiro: nenhum balão. -->
<Story name="Fits">
  <div class="w-60">
    <TruncatedText data={{ text: 'Aguardando' }} ui={{ className: 'truncate' }} />
  </div>
</Story>

<!-- Duas linhas e corte. -->
<Story name="TwoLines">
  <div class="w-48">
    <TruncatedText
      data={{
        text: 'A máquina desliga sozinha depois de meia hora ligada, sempre perto do almoço',
      }}
      ui={{ className: 'line-clamp-2' }}
    />
  </div>
</Story>
