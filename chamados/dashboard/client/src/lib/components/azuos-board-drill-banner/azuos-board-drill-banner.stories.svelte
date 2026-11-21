<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import BoardDrillBanner from './azuos-board-drill-banner.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardDrillBanner',
    component: BoardDrillBanner,
    parameters: { layout: 'padded' },
  });

  const actions = { onClear: () => {}, onBack: () => {} };
</script>

<Story
  name="Default"
  args={{ data: { summary: ['Chamados por situação', 'Situação: Aberto', 'Últimos 30 dias'], notice: null }, actions }}
/>

<!-- Caso limite: muitas partes quebram em linhas, sem empurrar o "Limpar recorte" para fora. -->
<Story
  name="Recorte longo"
  args={{
    data: {
      summary: [
        'Chamados por responsável e situação',
        'Responsável: Pessoa de exemplo com nome comprido',
        'Situação: Aguardando retorno',
        'Últimos 30 dias',
        'Só os meus',
        'Prioridade: Alta',
        'Com o filtro salvo do bloco',
      ],
      notice: null,
    },
    actions,
  }}
/>

<!-- Estado de aviso: o recorte não deu para ler, e a tela abriu sem ele. -->
<Story
  name="Aviso"
  args={{ data: { summary: [], notice: 'Não deu para ler o recorte do painel: a tela abriu sem ele.' }, actions }}
/>
