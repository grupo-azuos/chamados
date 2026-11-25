<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-traceability-picker.svelte';

  /** Escolher o ponto de partida da Rastreabilidade: a busca de "Máquinas do chamado", escolha única. */
  const { Story } = defineMeta({ title: 'Components/AzuosTraceabilityPicker', component: Component, tags: ['autodocs'] });
</script>

<script lang="ts">
  const actions = { onSearch: fn(), onDepartmentChange: fn(), onPick: fn(), onClose: fn() };
  const machines = [
    { id: '4', title: 'Computador 04', subtitle: 'PARALEGAL-D04', detail: 'Ana Souza · Paralegal', departmentKey: '7', isOnline: true },
    { id: '5', title: 'Computador 05', subtitle: 'PARALEGAL-D05', detail: 'Sem responsável · Paralegal', departmentKey: '7', isOnline: false },
  ];
  const base = { selectedId: '4', search: '', department: '', departments: [{ value: '7', label: 'Paralegal' }] };
</script>

<Story name="Computador" args={{ data: { ...base, focus: 'computer', picks: machines }, actions }} />
<Story name="Pessoa" args={{ data: { ...base, focus: 'person', selectedId: '', picks: [{ id: 'u1', title: 'Ana Souza', subtitle: null, detail: null, departmentKey: null, person: { id: 'u1', name: 'Ana Souza', photo: null } }] }, actions }} />
<Story name="Nada encontrado" args={{ data: { ...base, focus: 'department', picks: [] }, actions }} />
