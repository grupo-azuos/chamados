<script lang="ts" module>
  import type { Snippet } from 'svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /**
   * O card de uso geral com tom — o par Svelte do `AzuosToneCard` do template, sobre a
   * `AzuosCardSurface`: superfície da marca, hover com a mancha do GSAP (no tom quando
   * `mode="interactive"`) e escolhido no azul claro da marca. Card novo usa um dos quatro
   * formatos (`AzuosStatCard`, `AzuosMiniStatCard`, `AzuosContentCard`, hero).
   */
  export type AzuosToneCardTone = AzuosCardTone;

  export type AzuosToneCardProps = {
    data?: { label?: string };
    ui?: { tone?: AzuosToneCardTone; mode?: 'static' | 'interactive'; className?: string };
    state?: { isSelected?: boolean };
    actions?: { onClick?: () => void };
    children: Snippet;
  };
</script>

<script lang="ts">
  import AzuosCardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions, children }: AzuosToneCardProps = $props();
</script>

<AzuosCardSurface
  {data}
  ui={{
    className: cn('p-4', ui?.className),
    isHoverColored: ui?.mode === 'interactive',
    hoverTone: ui?.tone,
  }}
  state={cardState}
  {actions}
>
  {@render children()}
</AzuosCardSurface>
