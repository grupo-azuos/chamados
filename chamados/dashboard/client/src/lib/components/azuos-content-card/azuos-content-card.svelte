<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /**
   * O CARD DE CONTEÚDO: uma máquina, um projeto, qualquer coisa com título e detalhes. Superfície
   * da marca com o ícone do assunto grande no canto, no sotaque dele. O mesmo desenho do template.
   */
  export type AzuosContentCardProps = {
    data?: { label?: string };
    ui?: { tone?: AzuosCardTone; icon?: LucideIcon; isHoverColored?: boolean; className?: string };
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
    markTone: ui?.tone,
    isHoverColored: ui?.isHoverColored,
    hoverTone: ui?.tone,
  }}
  state={cardState}
  {actions}
>
  {@render children()}
</AzuosCardSurface>
