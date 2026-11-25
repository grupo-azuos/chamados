<!--
  @component
  A PORTA do módulo Sistema: a tela cheia que pede para a pessoa vincular o GitHub antes de entrar.

  Um card centralizado com o pedido e três saídas: "Vincular GitHub" (abre a autorização),
  "Verificar novamente" (para quem já autorizou em outra aba) e "Ir para meu perfil". Enquanto
  confere a vinculação mostra só o aviso de espera; se a integração ainda não foi configurada pelo
  administrador, avisa e trava o botão de vincular.

  - `state`: `isLoading` (conferindo), `isConfigured`, `isConnecting` (abrindo o GitHub) e `error`.
  - `actions`: `onConnect`, `onRetry` e `onLeave`.
-->
<script lang="ts" module>
  export type AzuosGithubLinkGateProps = {
    state: {
      isLoading: boolean;
      isConfigured: boolean;
      isConnecting: boolean;
      error: string | null;
    };
    actions: { onConnect: () => void; onRetry: () => void; onLeave: () => void };
  };
</script>

<script lang="ts">
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  let { state, actions }: AzuosGithubLinkGateProps = $props();
</script>

<section
  aria-label="Vinculação obrigatória do GitHub"
  class="flex min-h-svh w-full items-center justify-center bg-background p-6"
>
  <ContentCard data={{ label: '', title: '' }} ui={{ className: 'w-full max-w-md' }}>
{#snippet body()}
<div class="flex flex-col items-center gap-5 p-8 text-center">
    <GitBranch class="size-10 text-primary" aria-hidden="true" />
    <h1 class="text-xl font-semibold text-foreground">Vincule seu GitHub para acessar Sistema</h1>
    {#if state.isLoading}
      <p role="status" class="text-sm text-muted-foreground">Verificando sua vinculação…</p>
    {:else}
      <p class="text-sm text-muted-foreground">
        Conecte sua conta para acompanhar os projetos, issues e pull requests. O acesso ao módulo
        será liberado após a autorização.
      </p>
      {#if state.error}
        <p role="alert" class="text-sm text-destructive">{state.error}</p>
      {/if}
      {#if !state.isConfigured && !state.error}
        <p role="status" class="text-sm text-muted-foreground">
          A integração ainda precisa ser configurada pelo administrador.
        </p>
      {/if}
      <ActionButton
        data={{ label: 'Vincular GitHub', loadingLabel: 'Abrindo GitHub…' }}
        ui={{ icon: GitBranch, size: 'lg', className: 'w-full' }}
        state={{ isLoading: state.isConnecting, isDisabled: !state.isConfigured }}
        actions={{ onClick: actions.onConnect }}
      />
      <ActionButton
        data={{ label: 'Verificar novamente' }}
        ui={{ variant: 'secondary', className: 'w-full' }}
        actions={{ onClick: actions.onRetry }}
      />
    {/if}
    <ActionButton
      data={{ label: 'Ir para meu perfil' }}
      ui={{ variant: 'ghost' }}
      actions={{ onClick: actions.onLeave }}
    />
  </div>
{/snippet}
</ContentCard>
</section>
