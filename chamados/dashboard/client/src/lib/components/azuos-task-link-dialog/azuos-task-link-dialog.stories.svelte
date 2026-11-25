<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-task-link-dialog.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTaskLinkDialog',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onKindChange: fn(), onSearch: fn(), onToggle: fn(), onConfirm: fn(), onClose: fn() };
  const options = [
    { id: 2, label: 'Computador 02' },
    { id: 3, label: 'Computador 03' },
    { id: 4, label: 'Notebook 01' },
  ];
</script>

<Story name="Default" args={{ data: { kind: 'computer', term: '', options, selectedIds: [3] }, state: { isOpen: true }, actions }} />
<Story name="Buscando" args={{ data: { kind: 'ticket', term: 'impressora', options: [], selectedIds: [] }, state: { isOpen: true, isSearching: true }, actions }} />
<Story name="SemResultado" args={{ data: { kind: 'part', term: 'xyz', options: [], selectedIds: [] }, state: { isOpen: true }, actions }} />
