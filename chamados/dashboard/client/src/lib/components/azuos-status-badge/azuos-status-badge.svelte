<script lang="ts" module>
  import { cn } from '$lib/utils/cn';

  /**
   * Um selo de situação: texto curto sobre fundo de cor.
   *
   * O TOM É PASSADO, NÃO ESCOLHIDO AQUI. Quem sabe que "Resolvido" é verde é o domínio (ex.:
   * `ticketStatusTone` em `shared/src/domain`) — deixar cada tela escolher a cor é como a mesma
   * situação aparece verde numa lista e cinza em outra.
   */
  export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

  export type AzuosStatusBadgeProps = {
    data: { label: string | null | undefined };
    ui?: { tone?: StatusBadgeTone; size?: 'sm' | 'md'; className?: string };
  };

  /* O selo segue os cards: fundo neutro, texto no sotaque do tom (`$lib/utils/card-tone.util`). */
  const TONE_CLASSES: Record<StatusBadgeTone, string> = {
    neutral: 'bg-muted text-hue-slate',
    info: 'bg-muted text-hue-steel',
    success: 'bg-muted text-hue-green',
    warning: 'bg-muted text-hue-amber',
    danger: 'bg-muted text-hue-red',
    brand: 'bg-muted text-hue-blue',
  };
</script>

<script lang="ts">
  let { data, ui }: AzuosStatusBadgeProps = $props();
</script>

<!-- Situação vazia não é uma situação: um selo cinza escrito "—" faria parecer que alguém
     respondeu algo. Linha que ninguém tocou fica sem selo. -->
{#if !data.label}
  <span class={cn('text-ink-500 text-xs', ui?.className)}>Não preenchido</span>
{:else}
  <span
    class={cn(
      'inline-flex max-w-full items-center rounded-full font-semibold whitespace-normal break-words',
      ui?.size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      TONE_CLASSES[ui?.tone ?? 'neutral'],
      ui?.className,
    )}
  >
    {data.label}
  </span>
{/if}
