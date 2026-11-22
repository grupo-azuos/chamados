<!--
  @component
  O card de uso geral com tom — o par Svelte do `AzuosToneCard` do template, sobre a
  `AzuosCardSurface`: superfície da marca, véu no hover (tingido no tom, o tempo todo, quando
  `mode="interactive"`) e escolhido no azul claro da marca. Mantido para as telas que já o usam;
  card novo usa um dos quatro formatos (`AzuosStatCard`, `AzuosMiniStatCard`, `AzuosContentCard`,
  hero).

  `data.label` é o nome do card; `ui` leva o `tone`, o `mode` (`static`/`interactive`) e
  `className`; `state.isSelected` marca o escolhido; `actions.onClick` o torna clicável; o conteúdo
  vem em `children`.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

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
