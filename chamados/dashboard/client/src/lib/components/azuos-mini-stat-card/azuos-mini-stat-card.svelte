<!--
  @component
  O FILTRO PEQUENO: uma contagem por status, clicável — o painel tem uma fileira delas.

  Fica sobre o `AzuosCardSurface`: a bolinha leva o tom do status e o número fica na cor do texto,
  grande e com `tabular-nums`. O escolhido usa o destaque de seleção da superfície. O hover é o véu
  neutro da superfície; no tom, só com `ui.isHoverColored`.

  - `data`: o rótulo e o número.
  - `ui`: o tom (`tone`), o hover colorido e classes extras.
  - `state`: `isSelected`, quando o filtro deste cartão já está valendo.
  - `actions`: `onClick`, que liga ou desliga o filtro.
-->
<script lang="ts" module>
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export type AzuosMiniStatCardProps = {
    data: { label: string; value: number | string };
    ui?: { tone?: AzuosCardTone; isHoverColored?: boolean; className?: string };
    state?: { isSelected?: boolean };
    actions?: { onClick?: () => void };
  };
</script>

<script lang="ts">
  import AzuosCardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions }: AzuosMiniStatCardProps = $props();

  const tone = $derived(cardToneClasses(ui?.tone));
</script>

<AzuosCardSurface
  data={{ label: `${data.label}: ${data.value}` }}
  ui={{
    className: cn('rounded-box px-3 py-2.5', ui?.className),
    isHoverColored: ui?.isHoverColored,
    hoverTone: ui?.tone,
  }}
  state={cardState}
  {actions}
>
  <div
    class="text-muted-foreground flex min-w-0 items-center gap-2 text-sm leading-tight font-medium"
  >
    <span
      aria-hidden="true"
      class={cn(
        'group-data-[selected=true]/card:bg-on-card-selected size-2.5 shrink-0 rounded-full',
        tone.swatch,
      )}
    ></span>
    <span class="truncate" title={data.label}>{data.label}</span>
  </div>
  <div
    class={cn(
      'text-foreground group-data-[selected=true]/card:text-on-card-selected mt-1 text-xl leading-tight font-bold tabular-nums',
    )}
  >
    {data.value}
  </div>
</AzuosCardSurface>
