<script lang="ts">
  import { untrack } from 'svelte';

  import { goto } from '$app/navigation';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import MyProfileView from '$lib/components/azuos-my-profile-view/azuos-my-profile-view.svelte';
  import { useMyProfileModel } from '$lib/hooks/use-my-profile/use-my-profile.svelte';
  import SupportHeader from '../components/azuos-support-header/azuos-support-header.svelte';
  import type { PageData } from './$types';

  /**
   * MEU PERFIL na Central de Chamados — a mesma ficha dos 13 sistemas (`MyProfileView`), sem a
   * casca dos módulos.
   *
   * Quem só abre chamado não tem módulo nenhum, e o perfil do painel (`/profile`) mora dentro
   * da casca de módulo. Aqui a ficha é a mesma; muda só a moldura: o cabeçalho da Central, com
   * o caminho de volta. Módulos, WhatsApp e equipe ficam no perfil do painel — são de quem
   * atende, não de quem pede.
   */
  let { data }: { data: PageData } = $props();

  const profile = useMyProfileModel({ user: untrack(() => data.user) });
</script>

<svelte:head>
  <title>Meu perfil — Central de Chamados TI</title>
</svelte:head>

{#snippet headerActions()}
  <ActionButton
    data={{ label: 'Voltar para a Central' }}
    ui={{ variant: 'secondary', className: 'shrink-0' }}
    actions={{ onClick: () => void goto('/support') }}
  />
{/snippet}

<div class="bg-background flex min-h-screen flex-col">
  <SupportHeader
    data={{
      title: 'Meu perfil',
      subtitle: 'Seus dados na conta do Grupo Azuos.',
      person: profile.data.person,
      profileHref: null,
    }}
    slots={{ actions: headerActions }}
  />

  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <MyProfileView data={profile.data} state={profile.state} actions={profile.actions} />
  </main>
</div>
