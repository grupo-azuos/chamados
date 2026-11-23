<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import InventoryFilters, { type InventoryFilter } from './azuos-inventory-filters.svelte';

  const emptyFilter: InventoryFilter = {
    search: '',
    departmentId: '',
    healthStatus: '',
    kind: '',
    onlyOnline: false,
    onlyOffline: false,
    alert: '',
    resourceCondition: '',
    preventive: '',
    includeArchived: false,
    responsibleId: '',
    upgrade: '',
  };

  /* Dados inventados: departamentos genéricos, nenhum nome de pessoa. */
  const departmentOptions = [
    { value: '4', label: 'Financeiro' },
    { value: '8', label: 'Recursos Humanos' },
    { value: '5', label: 'TI' },
  ];

  /* Pessoas inventadas; a foto é um avatar genérico, como na história do AzuosPersonAvatar. */
  const responsibleOptions = [
    { id: 'p-1', name: 'Camila Duarte', photo: 'https://i.pravatar.cc/64?img=47' },
    { id: 'p-2', name: 'Gabriel Moura', photo: null },
  ];

  const actions = {
    onSearchChange: () => {},
    onDepartmentChange: () => {},
    onHealthStatusChange: () => {},
    onKindChange: () => {},
    onOnlineChange: () => {},
    onOfflineChange: () => {},
    onAlertChange: () => {},
    onResourceConditionChange: () => {},
    onPreventiveChange: () => {},
    onArchivedChange: () => {},
    onResponsibleChange: () => {},
    onUpgradeChange: () => {},
    onClearFilters: () => {},
  };

  const { Story } = defineMeta({
    title: 'Infra/Inventário/InventoryFilters',
    component: InventoryFilters,
    tags: ['autodocs'],
  });
</script>

<!-- Sem filtro: só a barra, painel fechado. -->
<Story name="Default" args={{ data: { filter: emptyFilter, departmentOptions }, actions }} />

<!-- Chegou filtrada (um cartão do painel, um filtro salvo): painel aberto e etiquetas à vista. -->
<Story
  name="Filtered"
  args={{
    data: {
      filter: { ...emptyFilter, preventive: 'needed', onlyOffline: true, kind: 'notebook' },
      departmentOptions,
    },
    actions,
  }}
/>

<!-- Só busca e departamento: sem etiqueta, mas com "Limpar filtros". -->
<Story
  name="SearchOnly"
  args={{
    data: { filter: { ...emptyFilter, search: 'recepção', departmentId: '5' }, departmentOptions },
    actions,
  }}
/>

<!-- Caso limite: todos os filtros ligados de uma vez, no celular. -->
<Story
  name="EverythingOnMobile"
  globals={{ viewport: { value: 'celular' } }}
  args={{
    data: {
      filter: {
        ...emptyFilter,
        onlyOnline: true,
        healthStatus: 'critical',
        alert: 'memory',
        resourceCondition: '',
        preventive: 'needed',
        kind: 'desktop',
        includeArchived: true,
      },
      departmentOptions,
    },
    actions,
  }}
/>

<!-- Filtrada por uma pessoa: o campo de pessoa mostra a foto, e a etiqueta diz quem é. -->
<Story
  name="ByResponsible"
  args={{
    data: { filter: { ...emptyFilter, responsibleId: 'p-1' }, departmentOptions, responsibleOptions },
    actions,
  }}
/>

<!-- "(Sem responsável)": as máquinas que ainda não têm dono. -->
<Story
  name="WithoutResponsible"
  args={{
    data: { filter: { ...emptyFilter, responsibleId: 'none' }, departmentOptions, responsibleOptions },
    actions,
  }}
/>

<!-- Caso limite: a pessoa do link salvo não responde mais por máquina — a etiqueta fica genérica. -->
<Story
  name="ResponsibleGone"
  args={{
    data: { filter: { ...emptyFilter, responsibleId: 'p-gone' }, departmentOptions, responsibleOptions },
    actions,
  }}
/>

<!-- Filtrada por um motivo de upgrade: a etiqueta diz qual. -->
<Story
  name="ByUpgrade"
  args={{ data: { filter: { ...emptyFilter, upgrade: 'cpu' }, departmentOptions, responsibleOptions }, actions }}
/>

<!-- RH fora do ar: sem departamentos, a lista mostra só "Todos". -->
<Story name="NoDepartments" args={{ data: { filter: emptyFilter, departmentOptions: [] }, actions }} />
