<script lang="ts" module>
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /**
   * O FILTRO PEQUENO: uma contagem por status, clicável. Superfície da marca, bolinha e número no
   * sotaque do status, escolhido no azul claro da marca. O mesmo desenho do template.
   */
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
    class="flex min-w-0 items-center gap-2 text-xs leading-tight font-semibold tracking-wide uppercase"
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
      'group-data-[selected=true]/card:text-on-card-selected mt-1 text-xl leading-tight font-bold tabular-nums',
      tone.text,
    )}
  >
    {data.value}
  </div>
</AzuosCardSurface>
