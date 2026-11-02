<script lang="ts" module>
  /**
   * BOTÃO DE VOLTAR CANÔNICO DO GRUPO AZUOS.
   *
   * Regra absoluta de navegação da casa: todo retorno de página de detalhe/entidade utiliza
   * EXCLUSIVAMENTE este formato (`← Voltar para [destino]`). É um link de texto limpo, sem
   * moldura, sem caixa cinza, sem sombra e sem fundo: texto azul da marca (`text-brand-blue-700`),
   * sublinhado no hover, com seta fina de 14px à esquerda. É cópia fiel do voltar do paralegal
   * ("Voltar para empresas"), que é a referência do grupo — não mude o desenho aqui.
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

  const className = $derived(
    cn(
      'text-brand-blue-700 dark:text-foreground inline-flex items-center gap-1 self-start text-sm no-underline hover:underline',
      'focus-visible:ring-ring rounded-control focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      isDisabled && 'pointer-events-none opacity-50',
      ui?.className,
    ),
  );
</script>

{#snippet content()}
  <ArrowLeft class="size-3.5 shrink-0" aria-hidden="true" />
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
