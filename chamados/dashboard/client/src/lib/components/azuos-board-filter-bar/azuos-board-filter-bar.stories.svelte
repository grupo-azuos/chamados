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
    { id: 'ticketPriority', kind: 'ticketPriority', label: 'Prioridade', display: 'cards' },
    { id: 'periodo', kind: 'period', label: 'Período' },
  ];
  const counts = {
    pessoa: { total: 9, isLoading: false, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5 }, { key: 'Caio Reis', label: 'Caio Reis', value: 4 }] },
    ticketStatus: { total: 9, isLoading: false, series: [{ key: 'open', label: 'Aberto', value: 6 }, { key: 'in_progress', label: 'Em atendimento', value: 3 }] },
  };
  const exactDates = { ...EMPTY_BOARD_FILTER_VALUES, period: { mode: 'custom' as const, from: '2026-11-01', to: '2026-11-30' } };
  const actions = { onChange: () => {}, onClear: () => {}, onOpenChange: () => {}, onAdd: () => {}, onRemove: () => {}, onDisplayChange: () => {}, onWidthChange: () => {}, onPlaceChange: () => {} };
</script>

<Story name="Default" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, actions }} />

<Story name="Com filtro escolhido" args={{ data: { filters, values: { ...EMPTY_BOARD_FILTER_VALUES, person: 'Ana Lima' }, counts }, actions }} />

<!-- As pessoas com foto: quem não tem foto fica com as iniciais. -->
<Story name="Pessoas com foto" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts: { ...counts, pessoa: { ...counts.pessoa, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5, avatarUrl: '/icon-192.png' }, { key: 'Caio Reis', label: 'Caio Reis', value: 4, avatarUrl: null }] } } }, actions }} />

<!-- Caso limite: tela estreita — as peças descem uma por linha. -->
<!-- Com valores escolhidos e a faixa fechada pela seta: o cabeçalho fica, com o selo dos filtros
     ligados e o "Limpar filtros" na ponta direita. -->
<Story name="Fechado" args={{ data: { filters, values: { ...EMPTY_BOARD_FILTER_VALUES, person: 'Ana Lima', ticketStatus: 'open' }, counts }, state: { isOpen: false }, actions }} />

<!-- Datas exatas: as datas entram ao lado do período, na mesma fileira e na mesma altura. -->
<Story name="Datas exatas" args={{ data: { filters, values: exactDates, counts }, ui: { part: 'period' }, actions }} />

<!-- Caso limite: datas exatas numa largura de celular — as datas quebram para a linha de baixo. -->
<Story name="Datas exatas em tela estreita" parameters={{ viewport: { defaultViewport: 'mobile1' } }} args={{ data: { filters, values: exactDates, counts }, ui: { part: 'period' }, actions }} />

<Story name="Tela estreita" parameters={{ viewport: { defaultViewport: 'mobile1' } }} args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, actions }} />

<!-- Os cards: uma faixa da largura da barra, cada opção com quantos há nela. -->
<Story name="Cards" args={{ data: { filters: [{ id: 'ticketStatus', kind: 'ticketStatus', label: 'Situação', display: 'cards' }, { id: 'periodo', kind: 'period', label: 'Período' }], values: { ...EMPTY_BOARD_FILTER_VALUES, ticketStatus: 'open' }, counts }, actions }} />

<!-- Caso limite: um painel gravado com um desenho que a barra não tem (lista aberta) cai na lista suspensa. -->
<Story name="Desenho antigo" args={{ data: { filters: [{ id: 'ticketStatus', kind: 'ticketStatus', label: 'Situação', display: 'list' }], values: EMPTY_BOARD_FILTER_VALUES, counts }, actions }} />

<!-- Montando na Infraestrutura: só os filtros que valem no módulo, para pôr. -->
<Story name="Montando na Infraestrutura" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts, kinds: ['person', 'period', 'ticketStatus', 'ticketPriority', 'department', 'problemType', 'requester', 'computerHealth'] }, state: { isEditing: true }, actions }} />

<Story name="Montando" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, state: { isEditing: true }, actions }} />

<!-- Caso limite: nenhum filtro, montando — só os botões de pôr. -->
<Story name="Montando sem filtro" args={{ data: { filters: [], values: EMPTY_BOARD_FILTER_VALUES, counts: {} }, state: { isEditing: true }, actions }} />
