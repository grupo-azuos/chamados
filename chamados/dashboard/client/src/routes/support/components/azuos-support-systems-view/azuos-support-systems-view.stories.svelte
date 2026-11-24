<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-support-systems-view.svelte';

  /** O andamento dos sistemas na Central: um card por sistema, que abre o mapa dele. */
  const { Story } = defineMeta({ title: 'Support/AzuosSupportSystemsView', component: Component, tags: ['autodocs'] });
</script>

<script lang="ts">
  const actions = { onSearch: fn(), onOpen: fn(), onRetry: fn() };
  const systems = [
    { id: 1, name: 'Paralegal', description: 'Alvarás e contratos', status: 'active' as const, openTickets: 3, openIssues: 5, lastActivityAt: '2026-11-23T10:00:00.000Z' },
    { id: 2, name: 'Chamados', description: 'A Central de Chamados', status: 'maintenance' as const, openTickets: 0, openIssues: 1, lastActivityAt: null },
  ];
</script>

<Story name="Default" args={{ data: { systems, search: '', total: 2 }, actions }} />
<Story name="Nada encontrado" args={{ data: { systems: [], search: 'zzz', total: 2 }, actions }} />
<Story name="Carregando" args={{ data: { systems: [], search: '', total: 0 }, state: { isLoading: true }, actions }} />
