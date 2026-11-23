<!--
  @component
  O BOTÃO DE COPIAR que fica ao lado de um conteúdo (código, comando, link).

  É só o ícone, pequeno (`control-icon-sm`), em pílula, com a dica ao passar o mouse e o nome
  acessível vindo de `data.label` ("Copiar código"). Ao copiar, o ícone vira um ✓ e a dica e o
  nome viram "Copiado!" por dois segundos. Sem área de transferência (ou sem permissão), nada
  quebra: o botão não diz que copiou, e o conteúdo continua na tela para copiar à mão.

  Mora DENTRO da caixa do conteúdo, no canto. Na caixa invertida (fundo `bg-foreground`, como a
  do token), use `ui.tone: 'inverse'`: o ícone passa a usar a cor do fundo da página, que é a que
  se lê sobre a caixa nos dois temas.

  - `data`: `text` (o que vai para a área de transferência) e `label` (a dica e o nome do botão).
  - `ui`: `tone` (`default` | `inverse`) e `className`.
  - `actions`: `onCopied` (opcional) — avisa depois que copiou de verdade.
-->
<script lang="ts" module>
  export type AzuosCopyButtonProps = {
    data: { text: string; label: string };
    ui?: { tone?: 'default' | 'inverse'; className?: string };
    actions?: { onCopied?: () => void };
  };

  /** Quanto tempo o "Copiado!" fica antes de o botão voltar ao ícone de sempre. */
  export const COPIED_FEEDBACK_MS = 2000;

  /* Neutro na caixa cinza; na caixa invertida, a cor do fundo da página — o "branco" no claro e
     o "preto" no escuro, que é sempre o contrário da caixa. */
  const TONE_CLASS = {
    default: 'text-muted-foreground hover:bg-hover-veil hover:text-foreground',
    inverse: 'text-background/70 hover:bg-background/15 hover:text-background',
  } as const;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';

  import * as Tooltip from '$lib/components/ui/tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui, actions }: AzuosCopyButtonProps = $props();

  /* Estado puramente visual — se o ✓ está à mostra agora. Não é dado de domínio. */
  let isCopied = $state(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => clearTimeout(resetTimer));

  const label = $derived(isCopied ? 'Copiado!' : data.label);

  async function copy(): Promise<void> {
    /* Navegador sem área de transferência não pode quebrar a tela, nem fingir que copiou. */
    try {
      await navigator.clipboard.writeText(data.text);
    } catch {
      isCopied = false;
      return;
    }
    isCopied = true;
    actions?.onCopied?.();
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (isCopied = false), COPIED_FEEDBACK_MS);
  }
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          aria-label={label}
          class={cn(
            'control-icon-sm inline-flex shrink-0 items-center justify-center rounded-button transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            TONE_CLASS[ui?.tone ?? 'default'],
            ui?.className,
          )}
          onclick={() => void copy()}
        >
          {#if isCopied}
            <Check class="size-4" aria-hidden="true" />
          {:else}
            <Copy class="size-4" aria-hidden="true" />
          {/if}
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>{label}</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
<!-- Quem não enxerga a troca do ícone ouve o "Copiado!". -->
<span class="sr-only" role="status">{isCopied ? 'Copiado!' : ''}</span>
