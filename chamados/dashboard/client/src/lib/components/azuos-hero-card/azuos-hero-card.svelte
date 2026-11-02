<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  export type AzuosHeroCardTone =
    | 'brand'
    | 'accent'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'neutral';

  /**
   * CARTÃO DE DESTAQUE SÓLIDO (HERO CARD) DO GRUPO AZUOS.
   *
   * - Fundo de cor 100% sólida via tokens semânticos da casa (sem vidro ou gradientes).
   * - Canto de superfície (`rounded-surface`).
   * - Ícone grande no fundo à direita, como marca d'água temática.
   * - Título e descrição com contraste nos modos claro e escuro.
   * - Selo inferior de indicador ou benefício em contraste nítido.
   *
   * Com `to` vira link; com `onClick`, botão; sem nenhum dos dois, é só um artigo.
   */
  export type AzuosHeroCardProps = {
    data: {
      title: string;
      description?: string;
      badge?: string;
      icon: LucideIcon;
      to?: string;
    };
    ui?: { tone?: AzuosHeroCardTone; className?: string };
    actions?: { onClick?: (event: MouseEvent) => void };
    /** O que vai ao lado do selo — um botão pequeno, por exemplo. */
    children?: Snippet;
  };

  type ToneStyle = {
    container: string;
    title: string;
    description: string;
    badge: string;
    icon: string;
  };

  /* O card fica na superfície da marca; o tom é sotaque: o ícone grande do canto e a pastilha. */
  export const HERO_TONE_STYLES: Record<AzuosHeroCardTone, ToneStyle> = {
    brand: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-blue text-on-hue',
      icon: 'text-hue-blue',
    },
    accent: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-amber text-on-hue',
      icon: 'text-hue-amber',
    },
    success: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-green text-on-hue',
      icon: 'text-hue-green',
    },
    warning: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-amber text-on-hue',
      icon: 'text-hue-amber',
    },
    danger: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-red text-on-hue',
      icon: 'text-hue-red',
    },
    info: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-steel text-on-hue',
      icon: 'text-hue-steel',
    },
    neutral: {
      container: 'bg-card text-card-foreground border border-border hover:shadow-xl',
      title: '',
      description: 'text-muted-foreground',
      badge: 'bg-hue-slate text-on-hue',
      icon: 'text-hue-slate',
    },
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, actions, children }: AzuosHeroCardProps = $props();

  const styles = $derived(HERO_TONE_STYLES[ui?.tone ?? 'brand'] ?? HERO_TONE_STYLES.brand);
  const Icon = $derived(data.icon);
  const containerClass = $derived(
    cn(
      'rounded-surface shadow-card relative flex min-h-[148px] w-full flex-col justify-between overflow-hidden p-5 transition-transform hover:-translate-y-0.5',
      styles.container,
      ui?.className,
    ),
  );
  const interactiveClass =
    'group focus-visible:ring-ring block text-left focus-visible:ring-2 focus-visible:outline-none';
</script>

{#snippet inner()}
  <div
    data-slot="hero-card-icon"
    class={cn(
      'pointer-events-none absolute -right-5 -bottom-5 size-36 overflow-hidden transition-transform duration-300 select-none group-hover:scale-105',
      styles.icon,
    )}
    aria-hidden="true"
  >
    <Icon class="size-full stroke-[1.2]" />
  </div>
  <div class="relative z-10 flex flex-col gap-1.5 pr-14 text-left">
    <h3 class={cn('text-lg leading-snug font-bold tracking-tight', styles.title)}>{data.title}</h3>
    {#if data.description}
      <p class={cn('text-xs leading-relaxed font-medium', styles.description)}>
        {data.description}
      </p>
    {/if}
  </div>
  <div class="relative z-10 mt-4 flex items-center gap-2">
    {#if data.badge}
      <span
        class={cn(
          'rounded-chip inline-flex items-center px-2.5 py-1 text-xs font-bold shadow-xs',
          styles.badge,
        )}
      >
        {data.badge}
      </span>
    {/if}
    {@render children?.()}
  </div>
{/snippet}

{#if data.to}
  <a
    href={data.to}
    class={cn(interactiveClass, 'no-underline', containerClass)}
    data-slot="azuos-hero-card"
    onclick={actions?.onClick}
  >
    {@render inner()}
  </a>
{:else if actions?.onClick}
  <button
    type="button"
    onclick={actions.onClick}
    class={cn(interactiveClass, 'cursor-pointer', containerClass)}
    data-slot="azuos-hero-card"
  >
    {@render inner()}
  </button>
{:else}
  <div role="article" class={containerClass} data-slot="azuos-hero-card">
    {@render inner()}
  </div>
{/if}
