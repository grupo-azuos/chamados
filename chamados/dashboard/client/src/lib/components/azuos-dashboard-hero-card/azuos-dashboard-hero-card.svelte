<!--
  @component
  O DESTAQUE DO PAINEL: o Zuzu falando o alerta do dia, no card de conteúdo (o único card do
  grupo) — o Zuzu no lugar do ícone, a frase no corpo, e os números do dia em cards de painel LOGO
  ABAIXO (nunca dentro: card não vai dentro de card). O Zuzu é estático.
  O número com `onClick` vira botão (leva à lista daquele número); sem ele, é só leitura.
  Props: `data` traz o título, a descrição, o sobretítulo, a hora, o selo, a pose do Zuzu e os
  números (`stats`); `ui.className` ajusta a caixa; `children` é o que vai embaixo dos números.
-->
<script lang="ts" module>
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import type { AzuosZuzuPose } from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';

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
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import Zuzu from '$lib/components/azuos-zuzu/azuos-zuzu.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosDashboardHeroCardProps = $props();

  const name = $derived(data.eyebrow ?? data.title);
</script>

<div
  role="region"
  aria-label={name}
  data-slot="azuos-dashboard-hero-card"
  class={cn('flex w-full flex-col gap-3', ui?.className)}
>
  <ContentCard data={{ label: name, title: data.eyebrow ?? 'Alerta do dia', meta: data.timestamp ?? null }}>
    {#snippet leading()}
      <span data-slot="dashboard-zuzu" class="shrink-0 select-none" aria-hidden="true">
        <Zuzu data={{ pose: data.zuzu?.pose ?? 'alert' }} ui={{ size: Math.min(data.zuzu?.size ?? 72, 72) }} />
      </span>
    {/snippet}
    {#snippet body()}
      <div class="flex min-w-0 flex-col gap-1.5">
        <h2 class="text-foreground text-xl leading-snug font-bold tracking-tight">{data.title}</h2>
        {#if data.description}
          <p class="text-muted-foreground text-sm leading-relaxed">{data.description}</p>
        {/if}
        {#if data.badge}
          <span class="rounded-chip bg-muted text-foreground w-fit px-2.5 py-1 text-xs font-semibold">
            {data.badge}
          </span>
        {/if}
      </div>
    {/snippet}
  </ContentCard>

  {#if data.stats?.length}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.stats as stat, index (`${stat.label}-${index}`)}
        <!-- Cada indicador é o card de conteúdo de painel: o número grande, e clicável vira atalho. -->
        <ContentCard
          data={{ label: stat.label, title: stat.label, highlight: { value: stat.value, hint: stat.hint } }}
          ui={{ icon: stat.icon, iconTone: stat.tone }}
          state={{ isSelected: stat.isActive }}
          actions={stat.onClick ? { onOpen: stat.onClick } : undefined}
        />
      {/each}
    </div>
  {/if}

  {#if children}
    <div>{@render children()}</div>
  {/if}
</div>
