<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /**
   * A SUPERFÍCIE de todo card do grupo — o andar de baixo dos quatro formatos (card de painel,
   * filtro pequeno, filtro grande com ícone e card de conteúdo). O mesmo desenho do template.
   *
   * - Fundo: sempre a superfície da marca (`bg-card`), com a borda neutra. Cor entra só como
   *   sotaque (`$lib/utils/card-tone.util`).
   * - Hover: a mancha do GSAP (`$lib/motion/card-wash`). Neutra por padrão; colorida só com
   *   `ui.isHoverColored` + `ui.hoverTone`.
   * - Marca d'água: `ui.mark` desenha o ícone grande no canto, no sotaque de `ui.markTone`.
   * - Escolhido: o azul claro da marca (`bg-card-selected`) com texto branco.
   * - Clicável: um botão de verdade cobre o card inteiro.
   */
  export type AzuosCardSurfaceProps = {
    data?: { label?: string };
    ui?: {
      className?: string;
      isHoverColored?: boolean;
      hoverTone?: AzuosCardTone;
      mark?: LucideIcon;
      markTone?: AzuosCardTone;
    };
    state?: { isSelected?: boolean; isDisabled?: boolean };
    actions?: { onClick?: () => void };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cardWash, WASH_SIZE } from '$lib/motion/card-wash';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions, children }: AzuosCardSurfaceProps = $props();

  const isSelected = $derived(Boolean(cardState?.isSelected));
  const isDisabled = $derived(Boolean(cardState?.isDisabled));
  const isClickable = $derived(Boolean(actions?.onClick) && !isDisabled);
  const Mark = $derived(ui?.mark);

  /* A cor da mancha: o sotaque com transparência, ou um véu neutro do texto do tema. */
  const washColor = $derived(
    ui?.isHoverColored && ui.hoverTone
      ? `color-mix(in srgb, ${cardToneClasses(ui.hoverTone).color} 16%, transparent)`
      : 'color-mix(in srgb, var(--foreground) 6%, transparent)',
  );
</script>

<div
  role="group"
  aria-label={data?.label}
  data-slot="azuos-card-surface"
  data-selected={isSelected ? 'true' : undefined}
  use:cardWash
  class={cn(
    'group/card rounded-surface shadow-card relative isolate overflow-hidden transition-[box-shadow,transform,background-color] duration-150',
    /* A borda NEUTRA separa o card do fundo da página, que no claro é quase do mesmo branco. */
    isSelected
      ? 'bg-card-selected text-on-card-selected border border-transparent'
      : 'bg-card text-card-foreground border-border border',
    isClickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl',
    isSelected && isClickable && 'hover:bg-card-selected-hover',
    ui?.className,
  )}
>
  <!-- A mancha começa encolhida pelo `transform`, o mesmo que o GSAP anima: a classe `scale-0`
       usaria a propriedade `scale`, que se multiplica ao `transform` e a prenderia em zero. -->
  <span
    aria-hidden="true"
    data-slot="card-wash"
    class="pointer-events-none absolute top-0 left-0 -z-10 rounded-full"
    style:width="{WASH_SIZE}px"
    style:height="{WASH_SIZE}px"
    style:margin-left="{-WASH_SIZE / 2}px"
    style:margin-top="{-WASH_SIZE / 2}px"
    style:background-color={washColor}
    style:transform="scale(0)"
  ></span>

  {#if Mark}
    <span
      aria-hidden="true"
      data-slot="card-mark"
      class={cn(
        'pointer-events-none absolute -right-5 -bottom-5 -z-10 size-31 transition-transform duration-200 group-hover/card:scale-105 group-data-[selected=true]/card:text-on-card-selected',
        cardToneClasses(ui?.markTone).text,
      )}
    >
      <Mark class="block size-full stroke-1" />
    </span>
  {/if}

  {#if actions?.onClick}
    <button
      type="button"
      aria-label={data?.label}
      aria-pressed={isSelected}
      disabled={isDisabled}
      onclick={actions.onClick}
      class="rounded-surface focus-visible:ring-ring absolute inset-0 z-10 cursor-pointer focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default"
    ></button>
  {/if}

  {@render children()}
</div>
