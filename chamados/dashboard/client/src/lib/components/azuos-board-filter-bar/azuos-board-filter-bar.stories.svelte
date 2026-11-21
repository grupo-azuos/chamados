<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type BoardFilter, EMPTY_BOARD_FILTER_VALUES } from '@template/shared/schemas/dashboard-board.schema';

  import BoardFilterBar from './azuos-board-filter-bar.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardFilterBar',
    component: BoardFilterBar,
    parameters: { layout: 'padded' },
  });

  const filters: BoardFilter[] = [
    { id: 'pessoa', kind: 'person', label: 'Pessoa' },
    { id: 'ticketStatus', kind: 'ticketStatus', label: 'Situação' },
    { id: 'ticketPriority', kind: 'ticketPriority', label: 'Prioridade', display: 'chips', width: 'full' },
    { id: 'periodo', kind: 'period', label: 'Período' },
  ];
  const counts = {
    pessoa: { total: 9, isLoading: false, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5 }, { key: 'Caio Reis', label: 'Caio Reis', value: 4 }] },
    ticketStatus: { total: 9, isLoading: false, series: [{ key: 'open', label: 'Aberto', value: 6 }, { key: 'in_progress', label: 'Em atendimento', value: 3 }] },
  };
  const actions = { onChange: () => {}, onClear: () => {}, onAdd: () => {}, onRemove: () => {}, onDisplayChange: () => {}, onWidthChange: () => {}, onPlaceChange: () => {} };
</script>

<Story name="Default" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, actions }} />

<Story name="Com filtro escolhido" args={{ data: { filters, values: { ...EMPTY_BOARD_FILTER_VALUES, person: 'Ana Lima' }, counts }, actions }} />

<!-- Caso limite: um painel gravado com o desenho grande (cards) cai na lista suspensa. -->
<!-- As pessoas com foto: quem não tem foto fica com as iniciais. -->
<Story name="Pessoas com foto" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts: { ...counts, pessoa: { ...counts.pessoa, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5, avatarUrl: '/icon-192.png' }, { key: 'Caio Reis', label: 'Caio Reis', value: 4, avatarUrl: null }] } } }, actions }} />

<!-- Caso limite: tela estreita — as peças descem uma por linha. -->
<Story name="Tela estreita" parameters={{ viewport: { defaultViewport: 'mobile1' } }} args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, actions }} />

<Story name="Desenho antigo" args={{ data: { filters: [{ id: 'ticketStatus', kind: 'ticketStatus', label: 'Situação', display: 'cards' }], values: EMPTY_BOARD_FILTER_VALUES, counts }, actions }} />

<Story name="Montando" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, state: { isEditing: true }, actions }} />

<!-- Caso limite: nenhum filtro, montando — só os botões de pôr. -->
<Story name="Montando sem filtro" args={{ data: { filters: [], values: EMPTY_BOARD_FILTER_VALUES, counts: {} }, state: { isEditing: true }, actions }} />
