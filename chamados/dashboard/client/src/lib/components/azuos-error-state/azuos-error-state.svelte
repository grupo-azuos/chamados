<script lang="ts" module>
  /**
   * A falha, com o motivo escrito — nunca um silêncio nem um "algo deu errado".
   *
   * Duas formas, e a escolha não é estética: `block` ocupa o lugar do conteúdo que não
   * carregou (a lista inteira falhou); `inline` é uma linha dentro de um formulário ou
   * modal, onde o resto da tela continua válido e um bloco vermelho gigante assustaria mais
   * do que informa.
   *
   * `onRetry` só aparece quando tentar de novo pode de fato resolver. Um botão que reexecuta
   * uma recusa de permissão só ensina a pessoa a clicar duas vezes antes de pedir ajuda.
   * `role="alert"` é o que faz o leitor de tela anunciar a falha na hora em que ela aparece.
   */
  export type AzuosErrorStateProps = {
    data: { message: string; title?: string };
    ui?: { variant?: 'block' | 'inline'; className?: string };
    state?: { isRetrying?: boolean };
    actions?: { onRetry?: () => void };
  };
</script>

<script lang="ts">
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosErrorStateProps = $props();

  const isInline = $derived(ui?.variant === 'inline');
  const isRetrying = $derived(Boolean(state?.isRetrying));
</script>

<div
  role="alert"
  class={cn(
    'rounded-box bg-card shadow-card text-destructive flex gap-3',
    isInline ? 'items-center px-3 py-2' : 'items-start p-4',
    ui?.className
  )}
>
  <AlertTriangle
    class={cn('shrink-0', isInline ? 'size-4' : 'mt-0.5 size-5')}
    aria-hidden="true"
  />

  {#if isInline}
    <p class="min-w-0 flex-1 text-sm break-words">{data.message}</p>
  {:else}
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{data.title ?? 'Algo deu errado'}</p>
      <p class="mt-0.5 text-sm break-words text-destructive">{data.message}</p>
    </div>
  {/if}

  <!-- O botão não passa pelo `azuos-action-button` de propósito: é vermelho sobre fundo vermelho
       claro, uma combinação que nenhuma variante do botão tem. -->
  {#if actions?.onRetry}
    <button
      type="button"
      onclick={actions.onRetry}
      disabled={isRetrying}
      class="control-sm rounded-button bg-destructive-soft text-destructive hover:bg-destructive-soft inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold disabled:opacity-60"
    >
      <RotateCw class={cn('size-3.5', isRetrying && 'animate-spin')} aria-hidden="true" />
      Tentar de novo
    </button>
  {/if}
</div>
