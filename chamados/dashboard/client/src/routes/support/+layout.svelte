<script lang="ts">
  import { untrack, type Snippet } from 'svelte';

  import { page } from '$app/state';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import { useMyProfileModel } from '$lib/hooks/use-my-profile/use-my-profile.svelte';
  import { useSupportShellModel } from '$lib/hooks/use-support-shell/use-support-shell.svelte';
  import SupportNavbar from './components/azuos-support-navbar/azuos-support-navbar.svelte';
  import type { LayoutData } from './$types';

  /**
   * A CASCA da Central: a barra de cima, a mesma nas três telas (abrir, consultar, perfil).
   *
   * Mora no layout para não ser montada de novo a cada troca de tela — a foto da pessoa e o
   * tema ficam onde estão, só o conteúdo embaixo muda.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  /* Só o nome e a foto, para o cartão da pessoa — a mesma fonte do perfil. */
  const profile = useMyProfileModel({ user: untrack(() => data.user) });
  const shell = useSupportShellModel();
</script>

<div class="bg-background flex min-h-screen flex-col">
  <SupportNavbar
    data={{ activeHref: page.url.pathname, person: profile.data.person, theme: shell.data.theme }}
    state={{ isSigningOut: shell.state.isSigningOut }}
    actions={shell.actions}
  />

  {#if shell.state.signOutError}
    <div class="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <ErrorState data={{ message: shell.state.signOutError }} ui={{ variant: 'inline' }} />
    </div>
  {/if}

  {@render children()}
</div>
