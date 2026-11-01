<script lang="ts" module>
  /**
   * BOTÃO DE VOLTAR CANÔNICO DO GRUPO AZUOS.
   *
   * Regra absoluta de navegação da casa: todo retorno de página de detalhe/entidade utiliza
   * EXCLUSIVAMENTE este formato (`← Voltar para [destino]`). É um link de texto limpo, sem
   * moldura, sem caixa cinza, sem sombra e sem fundo, na cor primária da marca (`text-primary`),
   * com seta fina à esquerda.
   *
   * É proibido criar botões de voltar com variantes `outline`, circulares com ícone isolado,
   * botões cinzas ou textos arbitrários fora dessa convenção.
   */
  export type AzuosBackButtonProps = {
    data: {
      /** Nome amigável do destino, para compor "Voltar para [destination]". */
      destination?: string;
      /** Rótulo explícito (sem ele: "Voltar para {destination}" ou "Voltar"). */
      label?: string;
      /** Caminho de destino: com ele, vira um link `<a>`. */
      to?: string;
    };
    ui?: { className?: string };
    state?: { isDisabled?: boolean };
    actions?: {
      /** Sem ele e sem `to`, volta pelo histórico do navegador. */
      onClick?: (event: MouseEvent) => void;
    };
  };
</script>

<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosBackButtonProps = $props();

  const displayText = $derived(
    data.label ?? (data.destination ? `Voltar para ${data.destination}` : 'Voltar'),
  );
  const isDisabled = $derived(Boolean(state?.isDisabled));

  function handleClick(event: MouseEvent) {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    if (actions?.onClick) {
      actions.onClick(event);
      return;
    }
    if (!data.to) window.history.back();
  }

  /* `min-h-10`: o texto continua um link limpo, mas o alvo de clique tem os 40px da régua. */
  const className = $derived(
    cn(
      'group text-primary rounded-control inline-flex min-h-10 items-center gap-1.5 text-sm font-medium transition-colors',
      'hover:text-primary/80 focus-visible:ring-ring hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      isDisabled && 'pointer-events-none opacity-50',
      ui?.className,
    ),
  );
</script>

{#snippet content()}
  <ArrowLeft
    class="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
    aria-hidden="true"
  />
  <span>{displayText}</span>
{/snippet}

{#if data.to && !isDisabled}
  <a href={data.to} onclick={handleClick} class={className} data-slot="azuos-back-button">
    {@render content()}
  </a>
{:else}
  <button
    type="button"
    onclick={handleClick}
    disabled={isDisabled}
    class={className}
    data-slot="azuos-back-button"
  >
    {@render content()}
  </button>
{/if}
