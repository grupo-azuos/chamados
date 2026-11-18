<script lang="ts" module>
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';
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
  /** O nome de estado (`danger`…) ou o sotaque (`plum`…) da paleta de card. */
  export type AzuosDashboardHeroCardStatTone = AzuosCardTone;

  export type AzuosDashboardHeroCardStat = {
    label: string;
    value: string | number;
    hint?: string;
    tone?: AzuosDashboardHeroCardStatTone;
    icon?: LucideIcon;
    onClick?: () => void;
    /** O cartão escolhido, quando os cartões trocam o que a tela mostra. */
    isActive?: boolean;
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

</script>

<script lang="ts">
  import AzuosStatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import Zuzu from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosDashboardHeroCardProps = $props();

  const EyebrowIcon = $derived(data.eyebrowIcon);
</script>



<div
  role="region"
  aria-label={data.eyebrow ?? data.title}
  data-slot="azuos-dashboard-hero-card"
  class={cn(
    'rounded-surface shadow-card bg-brand-blue-900 text-on-dark relative flex w-full flex-col gap-6 overflow-hidden p-6 sm:p-7',
    ui?.className,
  )}
>
  {#if data.eyebrow || data.timestamp}
    <div class="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider uppercase">
      {#if EyebrowIcon}
        <EyebrowIcon class="text-accent-hero size-[18px] shrink-0" aria-hidden="true" />
      {/if}
      {#if data.eyebrow}
        <span class="text-on-dark">{data.eyebrow}</span>
      {/if}
      {#if data.timestamp}
        <span class="text-on-dark/80 font-normal tracking-normal normal-case">— {data.timestamp}</span>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
    <div data-slot="dashboard-zuzu" class="shrink-0 select-none" aria-hidden="true">
      <Zuzu data={{ pose: data.zuzu?.pose ?? 'alert' }} ui={{ size: data.zuzu?.size ?? 128 }} />
    </div>
    <div class="flex min-h-[120px] min-w-0 flex-1 flex-col justify-center gap-2 text-center sm:text-left">
      <h2 class="text-on-dark text-xl leading-snug font-bold tracking-tight sm:text-2xl">
        {data.title}
      </h2>
      {#if data.description}
        <p class="text-on-dark/80 text-sm leading-relaxed font-normal sm:text-base">
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
        <!-- Cada indicador é o card de painel do grupo: superfície da marca, sotaque na bolinha e
             no número, escolhido no azul claro da marca. -->
        <AzuosStatCard
          data={{ label: stat.label, value: stat.value, hint: stat.hint }}
          ui={{ tone: stat.tone, icon: stat.icon, className: 'p-4 text-left' }}
          state={{ isSelected: stat.isActive }}
          actions={stat.onClick ? { onClick: stat.onClick } : undefined}
        />
      {/each}
    </div>
  {/if}

  {#if children}
    <div>{@render children()}</div>
  {/if}
</div>
