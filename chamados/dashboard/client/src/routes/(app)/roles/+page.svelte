<script lang="ts">
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import { ROLE_CONTEXT_LABELS } from '@template/shared/schemas/user.schema';

  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import RoleListView from '$lib/components/azuos-role-list-view/azuos-role-list-view.svelte';
  import { useRolesModel } from '$lib/hooks/use-roles/use-roles.svelte';
  import RoleFormSlot from './role-form-slot.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const list = useRolesModel();

  type FormTarget = { role: InternalRole | null } | null;

  let formTarget = $state<FormTarget>(null);
</script>

<svelte:head>
  <title>Acessos por módulo</title>
</svelte:head>

<RoleListView
  data={{
    ...list.data,
    currentUser: data.user
      ? {
          name: data.user.name,
          email: data.user.email,
          image: data.user.image,
          role: data.user.role,
          roles: data.user.roles,
        }
      : undefined,
  }}
  state={list.state}
  actions={{
    ...list.actions,
    onCreate: () => (formTarget = { role: null }),
  }}
/>

{#if formTarget}
  {#key formTarget.role?.id ?? 'new'}
    <RoleFormSlot role={formTarget.role} onClose={() => (formTarget = null)} />
  {/key}
{/if}

<ConfirmDialog
  data={{
    title: 'Tirar este módulo?',
    description: `"${list.data.pendingDelete?.userEmail || list.data.pendingDelete?.userId || ''}" deixa de ver ${list.data.pendingDelete ? ROLE_CONTEXT_LABELS[list.data.pendingDelete.context] : ''}. Abrir chamado e validar documento continuam disponíveis.`,
    confirmLabel: 'Tirar módulo',
    confirmingLabel: 'Tirando…',
  }}
  state={{
    isOpen: list.data.pendingDelete !== null,
    isConfirming: list.state.isDeleting,
    error: list.state.deleteError,
  }}
  actions={{ onConfirm: list.actions.onConfirmDelete, onCancel: list.actions.onCancelDelete }}
/>
