<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import FilterPanel, { type FilterPanelField } from './azuos-filter-panel.svelte';

  /* Dados inventados: filtros genéricos de uma lista qualquer. */
  const primary: FilterPanelField = {
    key: 'department',
    label: 'Departamento',
    control: 'select',
    ariaLabel: 'Filtrar por departamento',
    allLabel: 'Todos os departamentos',
    value: '',
    options: [
      { value: 'Financeiro', label: 'Financeiro' },
      { value: 'TI', label: 'TI' },
    ],
  };

  const fields: FilterPanelField[] = [
    {
      key: 'connection',
      label: 'Conexão',
      control: 'pills',
      ariaLabel: 'Filtrar por conexão',
      allLabel: 'Todas',
      value: '',
      options: [
        { value: 'online', label: 'Online' },
        { value: 'offline', label: 'Offline' },
      ],
    },
    {
      key: 'status',
      label: 'Situação',
      control: 'select',
      ariaLabel: 'Filtrar por situação',
      allLabel: 'Todas',
      value: '',
      options: [
        { value: 'open', label: 'Aberto', tone: 'danger' },
        { value: 'in_progress', label: 'Em atendimento', tone: 'info' },
        { value: 'resolved', label: 'Resolvido', tone: 'success' },
        { value: 'cancelled', label: 'Cancelado', tone: 'neutral' },
      ],
    },
    {
      key: 'priority',
      label: 'Urgência',
      control: 'pills',
      ariaLabel: 'Filtrar por urgência',
      allLabel: 'Qualquer',
      value: '',
      options: [
        { value: 'low', label: 'Baixa', tone: 'neutral' },
        { value: 'medium', label: 'Média', tone: 'warning' },
        { value: 'high', label: 'Alta', tone: 'danger' },
      ],
    },
  ];

  /** O filtro de PESSOA: o campo de pessoa do sistema, com a foto, e "(Sem responsável)" antes. */
  const personField: FilterPanelField = {
    key: 'responsible',
    label: 'Responsável',
    control: 'person',
    ariaLabel: 'Filtrar por responsável',
    allLabel: 'Todos os responsáveis',
    value: '',
    options: [{ value: 'none', label: '(Sem responsável)' }],
    people: [
      { id: 'p-1', name: 'Camila Duarte', photo: 'https://i.pravatar.cc/64?img=47' },
      { id: 'p-2', name: 'Gabriel Moura', photo: null },
    ],
  };

  const actions = { onSearchChange: fn(), onFieldChange: fn(), onRemoveChip: fn(), onClearFilters: fn() };
  const search = { value: '', placeholder: 'Buscar…' };

  const { Story } = defineMeta({
    title: 'Componentes/FilterPanel',
    component: FilterPanel,
    tags: ['autodocs'],
  });
</script>

<!-- Sem filtro: só a barra, painel fechado. -->
<Story name="Default" args={{ data: { search, primary, fields, chips: [], canClear: false }, actions }} />

<!-- Chegou filtrada: painel aberto, contagem no botão e etiquetas com X. -->
<Story
  name="Filtered"
  args={{
    data: {
      search,
      primary,
      fields: fields.map((field) => (field.key === 'priority' ? { ...field, value: 'high' } : field)),
      chips: [{ key: 'priority', label: 'Urgência: Alta' }],
      canClear: true,
    },
    actions,
  }}
/>

<!-- Caso limite: sem filtro principal e sem a troca tabela/cards, no celular. -->
<Story
  name="MinimalOnMobile"
  globals={{ viewport: { value: 'celular' } }}
  args={{ data: { search, fields, chips: [], canClear: false }, ui: { showViewToggle: false }, actions }}
/>

<!-- As filas de chamados: a troca ganha a terceira opção, o quadro — aqui, marcado. -->
<Story
  name="WithKanbanView"
  args={{
    data: { search, primary, fields, chips: [], canClear: false },
    ui: { hasKanbanView: true },
    state: { isKanbanView: true },
    actions: { ...actions, onKanbanViewChange: () => {} },
  }}
/>

<!-- O filtro escondeu tudo: "Limpar filtros" fica com o aviso de lista vazia. -->
<Story
  name="FilteredOut"
  args={{
    data: { search: { ...search, value: 'nada' }, primary, fields, chips: [], canClear: true },
    state: { isFilteredOut: true },
    actions,
  }}
/>

<!-- Com o filtro de pessoa escolhido: painel aberto, a foto no campo e a etiqueta embaixo. -->
<Story
  name="PersonField"
  args={{
    data: {
      search,
      primary,
      fields: [{ ...personField, value: 'p-1' }, ...fields],
      chips: [{ key: 'responsible', label: 'Responsável: Camila Duarte' }],
      canClear: true,
    },
    ui: { columns: 4 },
    actions,
  }}
/>
