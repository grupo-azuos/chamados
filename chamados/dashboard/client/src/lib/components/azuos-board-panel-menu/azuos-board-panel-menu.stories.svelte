<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import PanelMenu from './azuos-board-panel-menu.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosBoardPanelMenu',
    component: PanelMenu,
    parameters: { layout: 'centered' },
  });

  const actions = { onView: () => {}, onEdit: () => {}, onDuplicate: () => {}, onRemove: () => {} };
</script>

<!-- Quem pode montar: Ver, Editar, Duplicar e Remover. -->
<Story name="Default" args={{ data: { title: 'Chamados por sistema' }, state: { canEdit: true }, actions }} />

<!-- Caso limite: quem só vê o painel tem só o "Ver". -->
<Story name="Só ver" args={{ data: { title: 'Chamados por sistema' }, state: { canEdit: false }, actions }} />
