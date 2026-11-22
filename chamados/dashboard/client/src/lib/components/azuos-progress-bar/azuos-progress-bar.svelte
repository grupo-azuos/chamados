<script lang="ts" module>
  export type AzuosProgressBarProps = {
    data: { percentage: number; done: number; total: number };
    ui?: {
      showCount?: boolean;
      /** O que está sendo contado, no plural, para o leitor de tela: "chamados", "etapas". */
      itemLabel?: string;
      /** O texto quando não há nada a cumprir. */
      emptyLabel?: string;
      className?: string;
    };
  };

  type ProgressTone = 'done' | 'close' | 'halfway' | 'behind';

  /* As cores de categoria dos gráficos (`lib/theme/tokens.css`), e não um verde fixo da paleta
     crua: assim a barra acompanha a troca de tema e combina com o gráfico ao lado dela no painel. */
  const TONE_CLASSES: Record<ProgressTone, string> = {
    done: 'bg-chart-2',
    close: 'bg-chart-3',
    halfway: 'bg-chart-5',
    behind: 'bg-chart-4',
  };

  /** Cada faixa tem um tom, e é por ele que a lista é lida de relance. */
  function progressTone(percentage: number): ProgressTone {
    if (percentage >= 100) return 'done';
    if (percentage >= 70) return 'close';
    if (percentage >= 40) return 'halfway';

    return 'behind';
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosProgressBarProps = $props();

  const percentage = $derived(Math.min(100, Math.max(0, data.percentage)));
  const tone = $derived(progressTone(percentage));
</script>

{#if data.total === 0}
  <span class={cn('text-ink-500 text-xs', ui?.className)}>
    {ui?.emptyLabel ?? 'Nada a cumprir'}
  </span>
{:else}
  <div class={cn('flex items-center gap-2', ui?.className)}>
    <div
      class="bg-ink-100 h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Concluído: ${data.done} de ${data.total} ${ui?.itemLabel ?? 'itens'}`}
    >
      <div
        class={cn('h-full rounded-full transition-[width]', TONE_CLASSES[tone])}
        style="width: {percentage}%;"
      ></div>
    </div>
    <span class="text-ink-700 w-14 shrink-0 text-right text-xs tabular-nums">
      {ui?.showCount ? `${data.done}/${data.total}` : `${percentage}%`}
    </span>
  </div>
{/if}
