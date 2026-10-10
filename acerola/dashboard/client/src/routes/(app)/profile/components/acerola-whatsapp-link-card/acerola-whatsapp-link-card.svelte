<script lang="ts" module>
  import type { WhatsappLinkState } from '@template/shared/schemas/whatsapp-connection.schema';

  /**
   * O cartão de WhatsApp do perfil: mostra se há um número vinculado e oferece vincular ou
   * desvincular.
   *
   * Só aparece para quem pode vincular — quem decide é a tela, que nem monta o cartão para os
   * demais. Aqui dentro não há regra de permissão.
   */
  export type AcerolaWhatsappLinkCardProps = {
    data: {
      /** O número vinculado, já formatado para leitura. Vazio quando não há. */
      phone: string;
    };
    state: {
      isLoading?: boolean;
      /** A integração existe nesta instalação? Sem ela, o cartão explica e não oferece botão. */
      isConfigured: boolean;
      linkState: WhatsappLinkState;
      error?: string | null;
    };
    actions: { onLink: () => void; onUnlink: () => void };
  };
</script>

<script lang="ts">
  import MessageCircle from '@lucide/svelte/icons/message-circle';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';

  let { data, state, actions }: AcerolaWhatsappLinkCardProps = $props();

  const isConnected = $derived(state.linkState === 'connected');
  /* Um vínculo começado e não terminado continua de onde parou. */
  const linkLabel = $derived(state.linkState === 'pairing' ? 'Continuar vínculo' : 'Vincular WhatsApp');
</script>

<section
  aria-labelledby="whatsapp-link-title"
  class="rounded-box border-border bg-card flex flex-col gap-4 border p-6 shadow-xs md:flex-row md:items-center md:justify-between"
>
  <div class="flex min-w-0 items-start gap-3">
    <span
      class="bg-primary/10 text-primary rounded-chip flex size-9 shrink-0 items-center justify-center"
    >
      <MessageCircle class="size-5" aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="whatsapp-link-title" class="text-foreground text-sm font-semibold">WhatsApp</h2>
        {#if isConnected}
          <StatusBadge data={{ label: 'Conectado' }} ui={{ tone: 'success', size: 'sm' }} />
        {/if}
      </div>

      {#if state.isLoading}
        <p class="text-muted-foreground text-xs">Conferindo o vínculo…</p>
      {:else if !state.isConfigured}
        <p class="text-muted-foreground text-xs">
          A integração com o WhatsApp ainda não foi configurada nesta instalação. Fale com quem
          administra o sistema.
        </p>
      {:else if isConnected}
        <p class="text-muted-foreground text-xs">
          Seu número <span class="text-foreground font-medium">{data.phone}</span> envia as mensagens
          dos chamados em que você é o responsável.
        </p>
      {:else}
        <p class="text-muted-foreground text-xs">
          Vincule seu número para o sistema enviar, em seu nome, as mensagens dos chamados em que
          você é o responsável.
        </p>
      {/if}

      {#if state.error}
        <div class="mt-2">
          <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
        </div>
      {/if}
    </div>
  </div>

  {#if !state.isLoading && state.isConfigured}
    <div class="shrink-0">
      {#if isConnected}
        <ActionButton
          data={{ label: 'Desvincular' }}
          ui={{ variant: 'secondary' }}
          actions={{ onClick: actions.onUnlink }}
        />
      {:else}
        <ActionButton data={{ label: linkLabel }} actions={{ onClick: actions.onLink }} />
      {/if}
    </div>
  {/if}
</section>
