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
   * - Cor: card com tom (`ui.isHoverColored` + `ui.hoverTone`) fica TINGIDO o tempo todo — o tom
   *   a 16%, a mesma cor que a antiga mancha animada deixava no fim. Card sem tom fica na
   *   superfície e ganha só o véu neutro (`--hover-veil`) no hover, sem crescer de onde o mouse
   *   entrou.
   * - Marca d'água: `ui.mark` desenha o ícone grande no canto, no sotaque de `ui.markTone`.
   * - Escolhido: o azul claro da marca (`bg-card-selected`) com texto branco.
   * - Clicável: um botão de verdade cobre o card inteiro.
   */
  export type AzuosCardSurfaceProps = {
    data?: { label?: string };
    ui?: {
      className?: string;
      /** O card fica tingido, o tempo todo, na cor de `hoverTone`. Sem a flag, só o véu neutro no hover. */
      isHoverColored?: boolean;
      hoverTone?: AzuosCardTone;
      mark?: LucideIcon;
      markTone?: AzuosCardTone;
      /** `lg`: o ícone 30% maior, para card alto (a máquina do inventário). */
      markSize?: 'md' | 'lg';
    };
    state?: { isSelected?: boolean; isDisabled?: boolean };
    actions?: { onClick?: () => void };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cardToneClasses, cardToneStyle, cardToneVeilOf } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: cardState, actions, children }: AzuosCardSurfaceProps = $props();

  const isSelected = $derived(Boolean(cardState?.isSelected));
  const isDisabled = $derived(Boolean(cardState?.isDisabled));
  const isClickable = $derived(Boolean(actions?.onClick) && !isDisabled);
  const Mark = $derived(ui?.mark);

  /* O véu: o sotaque a 16% (card com tom, sempre à vista) ou o véu neutro do tema, o mesmo das
     linhas de lista (só no hover). */
  const isTinted = $derived(Boolean(ui?.isHoverColored && ui.hoverTone));
  const veilColor = $derived(isTinted ? cardToneVeilOf(ui?.hoverTone) : 'var(--hover-veil)');
</script>

<div
  role="group"
  aria-label={data?.label}
  data-slot="azuos-card-surface"
  data-selected={isSelected ? 'true' : undefined}
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
  <!-- O véu cobre o card inteiro: no hover, ou sempre no card tingido — sem crescer de onde o
       mouse entrou. -->
  <span
    aria-hidden="true"
    data-slot="card-wash"
    class={cn(
      'pointer-events-none absolute inset-0 -z-10 transition-colors duration-150',
      isTinted ? 'bg-(--card-veil)' : 'group-hover/card:bg-(--card-veil)',
    )}
    style:--card-veil={veilColor}
  ></span>

  {#if Mark}
    <span
      aria-hidden="true"
      data-slot="card-mark"
      class={cn(
        'pointer-events-none absolute -z-10 transition-transform duration-200 group-hover/card:scale-105 group-data-[selected=true]/card:text-on-card-selected',
        ui?.markSize === 'lg' ? '-right-6 -bottom-6 size-40' : '-right-5 -bottom-5 size-31',
        cardToneClasses(ui?.markTone).text,
      )}
      style={cardToneStyle(ui?.markTone).text}
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
