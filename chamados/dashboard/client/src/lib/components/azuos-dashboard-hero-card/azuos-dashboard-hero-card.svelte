<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import type { AzuosZuzuPose } from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';

  /**
   * O CARTÃO DE ABERTURA DO PAINEL: o Zuzu, uma frase sobre o momento e os números do dia.
   *
   * Fundo azul-escuro sólido, e cada número numa pastilha de fundo — cartão colorido nunca usa
   * borda no padrão Azuos: a cor vem do fundo. O Zuzu é estático.
   *
   * O número com `onClick` vira botão (leva à lista daquele número); sem ele, é só leitura.
   */
  export type AzuosDashboardHeroCardStatTone =
    | 'default'
    | 'danger'
    | 'warning'
    | 'info'
    | 'success'
    | 'brand';

  export type AzuosDashboardHeroCardStat = {
    label: string;
    value: string | number;
    hint?: string;
    tone?: AzuosDashboardHeroCardStatTone;
    icon?: LucideIcon;
    onClick?: () => void;
  };

  export type AzuosDashboardHeroCardProps = {
    data: {
      title: string;
      description?: string;
      eyebrow?: string;
      eyebrowIcon?: LucideIcon;
      timestamp?: string;
      badge?: string;
      zuzu?: { pose?: AzuosZuzuPose; size?: number };
      stats?: AzuosDashboardHeroCardStat[];
    };
    ui?: { className?: string };
    /** O que vai embaixo dos números — uma ação do painel, por exemplo. */
    children?: Snippet;
  };

  export const STAT_TONE_STYLES: Record<
    AzuosDashboardHeroCardStatTone,
    { value: string; icon: string; label: string }
  > = {
    default: { value: 'text-primary-foreground', icon: 'text-primary-soft', label: 'text-primary-soft' },
    danger: { value: 'text-destructive-soft', icon: 'text-destructive-soft', label: 'text-destructive-soft' },
    warning: { value: 'text-accent-hero', icon: 'text-accent-hero', label: 'text-accent-hero' },
    info: { value: 'text-info-soft', icon: 'text-info-soft', label: 'text-info-soft' },
    success: { value: 'text-success-soft', icon: 'text-success-soft', label: 'text-success-soft' },
    brand: { value: 'text-primary-foreground', icon: 'text-primary-soft', label: 'text-primary-foreground' },
  };
</script>

<script lang="ts">
  import Zuzu from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosDashboardHeroCardProps = $props();

  const EyebrowIcon = $derived(data.eyebrowIcon);
  const pillClass = 'rounded-surface bg-brand-blue-800 p-4 text-left transition-colors';
</script>

{#snippet statContent(stat: AzuosDashboardHeroCardStat)}
  {@const styles = STAT_TONE_STYLES[stat.tone ?? 'default'] ?? STAT_TONE_STYLES.default}
  {@const StatIcon = stat.icon}
  <div class="flex items-center gap-3">
    {#if StatIcon}
      <span
        class={cn(
          'rounded-chip bg-brand-blue-900 inline-flex size-10 shrink-0 items-center justify-center',
          styles.icon,
        )}
      >
        <StatIcon class="block size-5.5 shrink-0 stroke-[1.8]" aria-hidden="true" />
      </span>
    {/if}
    <span class={cn('text-xs leading-none font-bold tracking-wider uppercase', styles.label)}>
      {stat.label}
    </span>
  </div>
  <strong class={cn('mt-2.5 block text-3xl font-bold tabular-nums', styles.value)}>{stat.value}</strong>
  {#if stat.hint}
    <span class="text-primary-soft mt-1 block text-xs">{stat.hint}</span>
  {/if}
{/snippet}

<div
  role="region"
  aria-label={data.eyebrow ?? data.title}
  data-slot="azuos-dashboard-hero-card"
  class={cn(
    'rounded-surface shadow-card bg-brand-blue-900 text-primary-foreground relative flex w-full flex-col gap-6 overflow-hidden p-6 sm:p-7',
    ui?.className,
  )}
>
  {#if data.eyebrow || data.timestamp}
    <div class="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider uppercase">
      {#if EyebrowIcon}
        <EyebrowIcon class="text-accent-hero size-[18px] shrink-0" aria-hidden="true" />
      {/if}
      {#if data.eyebrow}
        <span class="text-primary-foreground">{data.eyebrow}</span>
      {/if}
      {#if data.timestamp}
        <span class="text-primary-soft font-normal tracking-normal normal-case">— {data.timestamp}</span>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
    <div data-slot="dashboard-zuzu" class="shrink-0 select-none" aria-hidden="true">
      <Zuzu data={{ pose: data.zuzu?.pose ?? 'alert' }} ui={{ size: data.zuzu?.size ?? 128 }} />
    </div>
    <div class="flex min-h-[120px] min-w-0 flex-1 flex-col justify-center gap-2 text-center sm:text-left">
      <h2 class="text-primary-foreground text-xl leading-snug font-bold tracking-tight sm:text-2xl">
        {data.title}
      </h2>
      {#if data.description}
        <p class="text-primary-soft text-sm leading-relaxed font-normal sm:text-base">
          {data.description}
        </p>
      {/if}
      {#if data.badge}
        <div class="mt-1 flex items-center justify-center sm:justify-start">
          <span
            class="bg-accent-hero text-accent-hero-foreground rounded-chip inline-flex items-center px-2.5 py-1 text-xs font-bold shadow-xs"
          >
            {data.badge}
          </span>
        </div>
      {/if}
    </div>
  </div>

  {#if data.stats?.length}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.stats as stat, index (`${stat.label}-${index}`)}
        {#if stat.onClick}
          <button
            type="button"
            onclick={stat.onClick}
            class={cn(pillClass, 'hover:bg-brand-blue-700 cursor-pointer')}
          >
            {@render statContent(stat)}
          </button>
        {:else}
          <div class={pillClass}>{@render statContent(stat)}</div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if children}
    <div>{@render children()}</div>
  {/if}
</div>
