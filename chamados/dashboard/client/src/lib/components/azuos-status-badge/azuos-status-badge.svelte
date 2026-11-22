<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  import { cardHueFromHex, cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

  /**
   * O SELO DE SITUAÇÃO — "Aberto", "Em atendimento", "Resolvido". Uma palavra curta, num tom que
   * diz de relance se está tudo bem.
   */
  export type AzuosStatusBadgeProps = {
    data: { label: string | null | undefined };
    ui?: {
      tone?: StatusBadgeTone;
      /** Uma cor escolhida pela pessoa (`#rrggbb`): vira o tom mais próximo da paleta. */
      color?: string | null;
      icon?: LucideIcon;
      size?: 'sm' | 'md';
      className?: string;
    };
  };

  /* O selo no padrão Apple: FUNDO CLARO DO TOM com o texto no tom — o mesmo par em todos,
     inclusive no amarelo (fundo amarelo bem claro, texto escuro no claro e amarelo no escuro,
     pelo `-ink`). Selo amarelo cheio gritava mais que o resto da linha. */
  const TONE_CLASSES: Record<StatusBadgeTone, string> = {
    neutral: 'bg-muted text-muted-foreground',
    info: 'bg-info-soft text-info',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning-ink',
    danger: 'bg-destructive-soft text-destructive',
    brand: 'bg-primary-soft text-primary',
  };

  export function statusToneClass(ui: AzuosStatusBadgeProps['ui']): string {
    if (ui?.color) return cn('bg-muted', cardToneClasses(cardHueFromHex(ui.color)).text);

    return TONE_CLASSES[ui?.tone ?? 'neutral'];
  }
</script>

<script lang="ts">
  let { data, ui }: AzuosStatusBadgeProps = $props();

  const Icon = $derived(ui?.icon);
</script>

<!-- Situação vazia não é uma situação: um selo cinza escrito "—" faria parecer que alguém
     respondeu algo. Linha que ninguém tocou fica sem selo. -->
{#if !data.label}
  <span class={cn('text-muted-foreground text-xs', ui?.className)}>Não preenchido</span>
{:else}
  <span
    class={cn(
      /* `max-w-full`: numa coluna estreita o selo encolhe e corta o texto, nunca estoura. */
      'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full text-xs font-semibold whitespace-nowrap',
      ui?.size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1',
      statusToneClass(ui),
      ui?.className,
    )}
  >
    {#if Icon}
      <Icon class="size-3 shrink-0" aria-hidden="true" />
    {/if}
    <!-- O texto num `span` próprio: com `max-w-*` em `ui.className`, o selo corta com
         reticências em vez de empurrar a coluna. -->
    <span class="min-w-0 truncate">{data.label}</span>
  </span>
{/if}
