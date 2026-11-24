<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { traceabilityGraphFixture } from '$lib/utils/traceability.fixture.test-support';
  import Component from './azuos-traceability-map.svelte';

  /**
   * O mapa de rastreabilidade: cada computador numa ilha com o que passou por ele, e as pessoas e
   * os departamentos ao lado. Em aberto: linha tracejada e animada; de antes: apagado e pontilhado.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosTraceabilityMap',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onFocusChange: fn(), onIdChange: fn() };
  const options = {
    computers: [{ value: '1', label: 'PC-FISCAL-01' }],
    departments: [{ value: '3', label: 'Fiscal' }],
    people: [{ id: 'ana', name: 'Ana Souza', photo: null }],
  };
  const graph = traceabilityGraphFixture();
</script>

<Story name="Default" args={{ data: { focus: 'department', id: '3', ...options, graph }, actions }} />
<Story name="Sem escolha" args={{ data: { focus: 'person', id: '', ...options, graph: null }, actions }} />
<Story name="Nada ligado" args={{ data: { focus: 'computer', id: '1', ...options, graph: { focusId: 'computer:1', nodes: [], edges: [] } }, actions }} />
<Story name="Carregando" args={{ data: { focus: 'computer', id: '1', ...options, graph: null }, state: { isLoading: true }, actions }} />
