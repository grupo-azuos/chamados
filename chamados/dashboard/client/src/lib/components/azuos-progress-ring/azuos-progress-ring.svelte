<script lang="ts" module>
  /**
   * O andamento GERAL num anel, com o percentual no meio — é o número que a pessoa procura
   * primeiro ao bater o olho num card ("quanto já chegou?"). As barras ficam para o detalhe.
   *
   * As cores seguem as faixas da `AzuosProgressBar` (vermelho, laranja, amarelo, verde), para o
   * mesmo percentual ter a mesma cor nos dois lugares. Concluído é verde cheio.
   *
   * Nada a cumprir não é 0% vermelho: o anel fica cinza e diz "—".
   */
  export type AzuosProgressRingProps = {
    data: { done: number; total: number };
    ui?: { size?: 'md' | 'lg'; className?: string };
  };

  export type RingTone = 'success' | 'warning' | 'alert' | 'danger' | 'empty';

  const SIZES = { md: 52, lg: 64 } as const;
  export const STROKE = 6;

  const TONE_CLASSES: Record<RingTone, string> = {
    success: 'stroke-success',
    warning: 'stroke-warning',
    alert: 'stroke-chart-5',
    danger: 'stroke-destructive',
    empty: 'stroke-transparent',
  };

  export function ringTone(total: number, percentage: number): RingTone {
    if (total === 0) return 'empty';
    if (percentage >= 100) return 'success';
    if (percentage >= 70) return 'warning';
    if (percentage >= 40) return 'alert';

    return 'danger';
  }

  export function ringPercentage(done: number, total: number): number {
    const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

    return Math.min(100, Math.max(0, percentage));
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosProgressRingProps = $props();

  const size = $derived(SIZES[ui?.size ?? 'md']);
  const radius = $derived((size - STROKE) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const clamped = $derived(ringPercentage(data.done, data.total));
</script>

<div
  role="progressbar"
  aria-valuenow={clamped}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Entregue: ${data.done} de ${data.total} itens`}
  class={cn('relative inline-flex shrink-0 items-center justify-center', ui?.className)}
  style:width={`${size}px`}
  style:height={`${size}px`}
>
  <svg width={size} height={size} class="-rotate-90" aria-hidden="true">
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={STROKE}
      class="stroke-ink-100"
    />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke-width={STROKE}
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={circumference * (1 - clamped / 100)}
      class={cn('transition-[stroke-dashoffset]', TONE_CLASSES[ringTone(data.total, clamped)])}
    />
  </svg>
  <span class="text-ink-900 absolute text-xs font-bold tabular-nums">
    {data.total === 0 ? '—' : `${clamped}%`}
  </span>
</div>
