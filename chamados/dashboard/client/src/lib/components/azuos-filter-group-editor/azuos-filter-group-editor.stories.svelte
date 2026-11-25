<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type FilterGroup } from '@template/shared/schemas/dashboard-board.schema';

  import FilterGroupEditor from './azuos-filter-group-editor.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosFilterGroupEditor',
    component: FilterGroupEditor,
    parameters: { layout: 'padded' },
  });

  const group: FilterGroup = {
    id: 'g',
    combinator: 'and',
    rules: [
      { id: 'r1', field: 'priority', operator: '=', value: 'high' },
      { id: 'r2', field: 'createdAt', operator: '>=', value: '@today-30' },
      { id: 'g2', combinator: 'or', rules: [{ id: 'r3', field: 'assignee', operator: '=', value: '@me' }] },
    ],
  };
  const actions = { onChange: () => {} };
</script>

<Story name="Default" args={{ data: { source: 'infraTickets', group }, actions }} />

<Story name="Empty" args={{ data: { source: 'infraTickets', group: { id: 'g', combinator: 'and', rules: [] } }, actions }} />

<Story name="Or" args={{ data: { source: 'quotes', group: { id: 'g', combinator: 'or', rules: [{ id: 'r1', field: 'status', operator: 'in', value: ['pending', 'approved'] }] } }, actions }} />

<!-- Caso limite: no último nível, sem o botão de pôr outro grupo. -->
<Story name="AtDepthLimit" args={{ data: { source: 'infraTickets', group, depth: 4 }, actions }} />
