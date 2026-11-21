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
    { id: 'periodo', kind: 'period', label: 'Período' },
  ];
  const counts = {
    pessoa: { total: 9, isLoading: false, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 5 }, { key: 'Caio Reis', label: 'Caio Reis', value: 4 }] },
    ticketStatus: { total: 9, isLoading: false, series: [{ key: 'open', label: 'Aberto', value: 6 }, { key: 'in_progress', label: 'Em atendimento', value: 3 }] },
  };
  const actions = { onChange: () => {}, onClear: () => {}, onAdd: () => {}, onRemove: () => {}, onDisplayChange: () => {}, onPlaceChange: () => {} };
</script>

<Story name="Default" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, ui: { isInitiallyOpen: true }, actions }} />

<Story name="Recolhida com filtro" args={{ data: { filters, values: { ...EMPTY_BOARD_FILTER_VALUES, person: 'Ana Lima' }, counts }, actions }} />

<Story name="Chips" args={{ data: { filters: [{ ...filters[0]!, display: 'chips' }], values: { ...EMPTY_BOARD_FILTER_VALUES, person: 'Ana Lima' }, counts }, ui: { isInitiallyOpen: true }, actions }} />

<Story name="Cards" args={{ data: { filters: [{ id: 'ticketStatus', kind: 'ticketStatus', label: 'Situação', display: 'cards' }], values: EMPTY_BOARD_FILTER_VALUES, counts }, ui: { isInitiallyOpen: true }, actions }} />

<Story name="Editing" args={{ data: { filters, values: EMPTY_BOARD_FILTER_VALUES, counts }, state: { isEditing: true }, actions }} />

<!-- Caso limite: nenhum filtro, montando — só o "Pôr um filtro". -->
<Story name="EditingEmpty" args={{ data: { filters: [], values: EMPTY_BOARD_FILTER_VALUES, counts: {} }, state: { isEditing: true }, actions }} />
