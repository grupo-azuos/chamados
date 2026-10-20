<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Archive from '@lucide/svelte/icons/archive';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { fn } from 'storybook/test';

  import ActionMenu from './azuos-action-menu.svelte';

  const data = {
    label: 'Mais ações',
    items: [
      { id: 'token', label: 'Gerar token novo', icon: KeyRound },
      { id: 'archive', label: 'Arquivar', icon: Archive },
      { id: 'dispose', label: 'Descartar', icon: Trash2, isDestructive: true, separatorBefore: true },
    ],
  };
  const actions = { onSelect: fn() };
  const { Story } = defineMeta({ title: 'Components/AzuosActionMenu', component: ActionMenu });
</script>

<Story name="Default" args={{ data, actions }} />
<Story name="Disabled" args={{ data, actions, state: { isDisabled: true } }} />
<Story name="Long option" args={{ data: { ...data, items: [{ id: 'long', label: 'Consultar o histórico completo de movimentações deste equipamento' }] }, actions }} />
