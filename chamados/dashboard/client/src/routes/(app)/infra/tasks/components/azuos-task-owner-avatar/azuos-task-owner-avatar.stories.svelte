<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Component from './azuos-task-owner-avatar.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskOwnerAvatar',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<Story name="Default" args={{ owner: { id: 'a', name: 'Ana Prado', avatarUrl: null } }} />
<!-- Sem responsável: ícone neutro, não iniciais. -->
<Story name="SemResponsavel" args={{ owner: null }} />
