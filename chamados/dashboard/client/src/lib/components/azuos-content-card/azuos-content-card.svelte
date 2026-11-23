<!--
  @component
  O CARD DE CONTEÚDO: uma máquina, um projeto, qualquer coisa com título e detalhes.

  Superfície da marca (`AzuosCardSurface`) com o ícone do assunto grande no canto, no sotaque dele —
  é por ali que a cor do assunto aparece sem pintar o card. O conteúdo é livre (`children`). O hover
  é sempre o véu neutro da superfície — nunca no tom.

  Props: `data.label` é o nome acessível; `ui` traz o tom, o ícone e o tamanho da marca; `state.isSelected` marca o escolhido; com `actions.onClick` o card vira clicável.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export type AzuosContentCardProps = {
    data?: { label?: string };
    ui?: {
      tone?: AzuosCardTone;
      icon?: LucideIcon;
      markSize?: 'md' | 'lg';
      className?: string;
    };
    state?: { isSelected?: boolean };
    actions?: { onClick?: () => void };
    children: Snippet;
  };
</script>

<script lang="ts">
  import AzuosCardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions, children }: AzuosContentCardProps = $props();
</script>

<AzuosCardSurface
  {data}
  ui={{
    className: cn('flex flex-col gap-2 p-4', ui?.className),
    mark: ui?.icon,
    markSize: ui?.markSize,
    markTone: ui?.tone,
  }}
  state={cardState}
  {actions}
>
  {@render children()}
</AzuosCardSurface>
