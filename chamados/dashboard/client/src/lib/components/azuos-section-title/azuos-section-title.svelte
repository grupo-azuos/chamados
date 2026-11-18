<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  /**
   * O TÍTULO DE UMA SEÇÃO de cartão: quadradinho com ícone, título e uma linha de explicação.
   *
   * Existe para as seções de perfil e de detalhe terem o mesmo cabeçalho em todas as telas que as
   * mostram. Copiado em cada seção, o ícone sai de um tamanho diferente em cada lugar.
   *
   * O tom `danger` é só para a zona de perigo: o vermelho no título avisa antes do botão.
   * O `adornment` entra DENTRO do título, ao lado do texto — a contagem de uma lista, por exemplo.
   */
  export type AzuosSectionTitleProps = {
    data: { title: string; description?: string | null };
    ui: { icon: LucideIcon; tone?: 'brand' | 'danger'; className?: string };
    adornment?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, adornment }: AzuosSectionTitleProps = $props();

  const Icon = $derived(ui.icon);
  const isDanger = $derived(ui.tone === 'danger');
</script>

<div class={cn('flex items-start gap-3', ui.className)}>
  <span
    class={cn(
      'rounded-chip flex size-9 shrink-0 items-center justify-center',
      isDanger ? 'bg-destructive-soft text-destructive' : 'bg-primary-soft text-primary',
    )}
  >
    <Icon class="size-4" aria-hidden="true" />
  </span>
  <div class="min-w-0 flex-1">
    <h2
      class={cn(
        'flex flex-wrap items-center gap-2 text-lg font-semibold',
        isDanger ? 'text-destructive' : 'text-foreground',
      )}
    >
      {data.title}
      {@render adornment?.()}
    </h2>
    {#if data.description}
      <p class="text-ink-500 mt-1 text-sm">{data.description}</p>
    {/if}
  </div>
</div>
