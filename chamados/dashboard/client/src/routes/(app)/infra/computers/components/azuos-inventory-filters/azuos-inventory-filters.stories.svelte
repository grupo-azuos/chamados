<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import InventoryFilters, { type InventoryFilter } from './azuos-inventory-filters.svelte';

  const emptyFilter: InventoryFilter = {
    search: '',
    department: '',
    healthStatus: '',
    kind: '',
    onlyOnline: false,
    onlyOffline: false,
    alert: '',
    needsMaintenance: false,
    includeArchived: false,
  };

  /* Dados inventados: departamentos genéricos, nenhum nome de pessoa. */
  const departmentOptions = [
    { value: 'Financeiro', label: 'Financeiro' },
    { value: 'Recursos Humanos', label: 'Recursos Humanos' },
    { value: 'TI', label: 'TI' },
    { value: 'RECEPÇÃO', label: 'RECEPÇÃO', separatorBefore: true },
  ];

  const actions = {
    onSearchChange: () => {},
    onDepartmentChange: () => {},
    onHealthStatusChange: () => {},
    onKindChange: () => {},
    onOnlineChange: () => {},
    onOfflineChange: () => {},
    onAlertChange: () => {},
    onNeedsMaintenanceChange: () => {},
    onArchivedChange: () => {},
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
      filter: { ...emptyFilter, needsMaintenance: true, onlyOffline: true, kind: 'notebook' },
      departmentOptions,
    },
    actions,
  }}
/>

<!-- Só busca e departamento: sem etiqueta, mas com "Limpar filtros". -->
<Story
  name="SearchOnly"
  args={{
    data: { filter: { ...emptyFilter, search: 'recepção', department: 'TI' }, departmentOptions },
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
        needsMaintenance: true,
        kind: 'desktop',
        includeArchived: true,
      },
      departmentOptions,
    },
    actions,
  }}
/>

<!-- RH fora do ar: sem departamentos, a lista mostra só "Todos". -->
<Story name="NoDepartments" args={{ data: { filter: emptyFilter, departmentOptions: [] }, actions }} />
