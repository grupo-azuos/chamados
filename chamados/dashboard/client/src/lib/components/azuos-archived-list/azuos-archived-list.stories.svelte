<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AzuosArchivedList, { type AzuosArchivedItem } from './azuos-archived-list.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosArchivedList',
    component: AzuosArchivedList,
    parameters: { layout: 'padded' },
  });

  const items: AzuosArchivedItem[] = [
    { key: 'attachment:9', kind: 'Anexo', label: 'nota-fiscal-ssd.pdf', archivedAt: '2026-11-20T12:00:00.000Z', canRestore: true },
    { key: 'computer:3', kind: 'Máquina', label: 'CONTABIL-03', archivedAt: '2026-11-20T11:30:00.000Z', canRestore: true },
    { key: 'attachment:10', kind: 'Anexo', label: 'print-da-tela.png', archivedAt: '2026-11-19T09:00:00.000Z', canRestore: false },
  ];

  const idle = { isLoading: false, restoringKey: null, error: null };
  const actions = { onOpenChange: () => {}, onRestore: () => {} };
</script>

<Story name="Default" args={{ data: { items }, state: idle, actions }} />

<Story name="WithoutKind" args={{ data: { items: items.map(({ kind: _kind, ...item }) => item) }, state: idle, actions }} />

<Story name="Loading" args={{ data: { items: [] }, state: { ...idle, isLoading: true }, actions }} />

<Story name="Empty" args={{ data: { items: [] }, state: idle, actions }} />

<Story name="Restoring" args={{ data: { items }, state: { ...idle, restoringKey: 'attachment:9' }, actions }} />

<Story name="Error" args={{ data: { items: [] }, state: { ...idle, error: 'Não consegui carregar os removidos. Tente de novo.' }, actions }} />

<!-- Caso limite: nome comprido numa coluna estreita — corta com reticências e o botão fica. -->
<Story
  name="LongLabelInNarrowColumn"
  args={{
    data: {
      items: [{ key: 'attachment:1', kind: 'Anexo', label: 'orcamento-da-troca-do-ar-condicionado-da-sala-de-reuniao-do-segundo-andar.pdf', archivedAt: '2026-11-20T12:00:00.000Z', canRestore: true }],
    },
    ui: { className: 'max-w-[320px]' },
    state: idle,
    actions,
  }}
/>
