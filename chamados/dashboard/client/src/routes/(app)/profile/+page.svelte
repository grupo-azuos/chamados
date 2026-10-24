<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import Users from '@lucide/svelte/icons/users';
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import { ROLE_CONTEXT_LABELS } from '@template/shared/schemas/user.schema';
  import { type Component, untrack } from 'svelte';

  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import MyProfileView, {
    type MyProfileExtraSection,
  } from '$lib/components/azuos-my-profile-view/azuos-my-profile-view.svelte';
  import RoleListView from '$lib/components/azuos-role-list-view/azuos-role-list-view.svelte';
  import { useMyProfileModel } from '$lib/hooks/use-my-profile/use-my-profile.svelte';
  import { useRolesModel } from '$lib/hooks/use-roles/use-roles.svelte';
  import { useWhatsappLinkModel } from '$lib/hooks/use-whatsapp-link/use-whatsapp-link.svelte';
  import { useWhatsappTemplatesModel } from '$lib/hooks/use-whatsapp-templates/use-whatsapp-templates.svelte';
  import RoleFormSlot from '../roles/role-form-slot.svelte';
  import EffectsToggle from './components/azuos-effects-toggle/azuos-effects-toggle.svelte';
  import ModuleAccessCard from './components/azuos-module-access-card/azuos-module-access-card.svelte';
  import WhatsappLinkCard from './components/azuos-whatsapp-link-card/azuos-whatsapp-link-card.svelte';
  import WhatsappLinkDialog from './components/azuos-whatsapp-link-dialog/azuos-whatsapp-link-dialog.svelte';
  import WhatsappTemplatesDialog from './components/azuos-whatsapp-templates-dialog/azuos-whatsapp-templates-dialog.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  /* A lista da equipe é do super-admin: para os demais, o perfil é só o cartão deles. */
  const isSuperAdmin = untrack(() => data.user?.role === 'superadmin');
  const list = useRolesModel({ isEnabled: isSuperAdmin });
  /* `untrack`: o id de quem está logado não muda enquanto a tela está aberta. */
  const whatsapp = useWhatsappLinkModel(untrack(() => data.user?.id ?? ''));
  /* Os textos do bot são do super admin: para os demais o botão nem aparece. */
  const templates = useWhatsappTemplatesModel();
  const canEditTemplates = $derived(data.user?.role === 'superadmin');

  type FormTarget = { role: InternalRole | null } | null;
  let formTarget = $state<FormTarget>(null);

  /* A ficha padrão dos 13 sistemas; o que é só do Chamados entra depois, como seções a mais. */
  const profile = useMyProfileModel({ user: untrack(() => data.user) });

  const extraSections = $derived<MyProfileExtraSection[]>([
    { id: 'profile-modules', label: 'Seus módulos', icon: LayoutGrid as Component, content: modulesSection },
    ...(whatsapp.state.canLink
      ? [{ id: 'profile-whatsapp', label: 'WhatsApp', icon: MessageCircle as Component, content: whatsappSection }]
      : []),
    ...(isSuperAdmin
      ? [{ id: 'profile-team', label: 'Equipe', icon: Users as Component, content: teamSection }]
      : []),
  ]);
</script>

<svelte:head>
  <title>Meu perfil</title>
</svelte:head>

{#snippet modulesSection()}
  <ModuleAccessCard data={{ role: data.user?.role ?? 'user', roles: data.user?.roles }} />
{/snippet}

{#snippet whatsappSection()}
  <WhatsappLinkCard
    data={{
      phone: whatsapp.data.phone,
      sentToday: whatsapp.data.sentToday,
      dailyLimit: whatsapp.data.dailyLimit,
    }}
    state={{
      isLoading: whatsapp.state.isLoading,
      isConfigured: whatsapp.state.isConfigured,
      linkState: whatsapp.state.linkState,
      error: whatsapp.state.error,
    }}
    actions={{
      onLink: whatsapp.actions.onOpen,
      onUnlink: whatsapp.actions.onAskUnlink,
      onEditTemplates: canEditTemplates ? templates.actions.onOpen : undefined,
    }}
  />
{/snippet}

<!-- A lista da equipe é do super-admin: os acessos por módulo, como antes, dentro da ficha. -->
{#snippet teamSection()}
  <RoleListView
    data={list.data}
    ui={{ showTeam: true }}
    state={list.state}
    actions={{
      ...list.actions,
      onCreate: () => (formTarget = { role: null }),
    }}
  />
{/snippet}

{#snippet effectsPreference()}
  <div class="flex items-center justify-between gap-4">
    <div class="flex min-w-0 flex-col gap-1">
      <dt class="text-foreground text-sm font-medium">Efeitos</dt>
      <dd class="text-ink-500 text-xs">Use animações completas ou o modo leve.</dd>
    </div>
    <EffectsToggle ui={{ variant: 'surface' }} />
  </div>
{/snippet}

<MyProfileView
  data={profile.data}
  state={profile.state}
  actions={profile.actions}
  slots={{ extraSections, preferencesExtra: effectsPreference }}
/>

<WhatsappTemplatesDialog data={templates.data} state={templates.state} actions={templates.actions} />

<WhatsappLinkDialog
  data={{ qrImage: whatsapp.data.qrImage }}
  state={{
    step: whatsapp.state.step,
    secondsLeft: whatsapp.state.secondsLeft,
    isLinking: whatsapp.state.isLinking,
    error: whatsapp.state.linkError,
  }}
  actions={{ onConfirm: whatsapp.actions.onConfirmRisks, onClose: whatsapp.actions.onClose }}
/>

<ConfirmDialog
  data={{
    title: 'Desvincular seu WhatsApp?',
    description: `O número ${whatsapp.data.phone} deixa de enviar as mensagens dos chamados. Para voltar, será preciso ler o QR code de novo.`,
    confirmLabel: 'Desvincular',
    confirmingLabel: 'Desvinculando…',
  }}
  state={{
    isOpen: whatsapp.state.isUnlinkOpen,
    isConfirming: whatsapp.state.isUnlinking,
    error: whatsapp.state.unlinkError,
  }}
  actions={{
    onConfirm: whatsapp.actions.onConfirmUnlink,
    onCancel: whatsapp.actions.onCancelUnlink,
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
