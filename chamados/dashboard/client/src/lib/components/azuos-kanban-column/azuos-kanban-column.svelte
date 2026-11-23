<!--
  @component
  UMA COLUNA DE QUADRO (kanban): o cabeçalho na cor da etapa (ícone, nome, contagem e o lápis
  quando dá para editar), os cartões e o "Adicionar" no fim. O mesmo desenho do paralegal.

  Genérica: não sabe se o cartão é chamado ou projeto. Recebe os cartões prontos em `children`.
  O arrasto é do `@dnd-kit` (como no paralegal): com `ui.dropId`, a coluna é uma área de soltar
  dentro do `DragDropProvider` do quadro, e acende quando um cartão passa por cima. Quem decide o
  que "mover para esta coluna" significa é a tela, no `onDragEnd` dela.

  Props: `data` traz o título e a contagem; `ui` o tom e o ícone da etapa, o id de soltar, o texto
  do "Adicionar" e classes extras; `actions` o "Adicionar" (`onAdd`) e o lápis (`onEdit`).
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  export type AzuosKanbanColumnTone = AzuosCardTone;

  export type AzuosKanbanColumnProps = {
    data: { title: string; count: number };
    ui?: {
      tone?: AzuosKanbanColumnTone;
      icon?: LucideIcon;
      addLabel?: string;
      className?: string;
      /** O id desta coluna como área de soltar. Sem ele, não se solta cartão aqui. */
      dropId?: string;
    };
    actions?: { onAdd?: () => void; onEdit?: () => void };
    children?: Snippet;
  };
</script>

<script lang="ts">
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';

  import { createDroppable } from '@dnd-kit/svelte';
  import { untrack } from 'svelte';

  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, actions, children }: AzuosKanbanColumnProps = $props();

  /* A área de soltar só existe com `dropId`, e por isso só dentro de um quadro com o
     `DragDropProvider`: uma coluna solta (na história, num teste) é só desenho. O id da coluna
     não muda enquanto ela vive; o `untrack` deixa isso dito. */
  const droppable = untrack(() => ui?.dropId)
    ? createDroppable({
        get id() {
          return ui?.dropId ?? '';
        },
      })
    : null;
  const isOver = $derived(droppable?.isDropTarget ?? false);
  const Icon = $derived(ui?.icon);

  /* Sem área de soltar, o anexo não faz nada. */
  function attachDroppable(node: HTMLElement) {
    return droppable?.attach(node);
  }
</script>

<!-- `max-h-full` + o miolo que rola: num quadro de altura fixa (a tela cheia), a coluna comprida
     rola por dentro e a página não cresce para baixo. Num quadro sem altura, nada muda. -->
<section
  aria-label={data.title}
  class={cn(
    'bg-mantle rounded-surface flex max-h-full min-h-0 w-72 shrink-0 flex-col transition-colors sm:w-80',
    isOver && 'bg-accent',
    ui?.className,
  )}
  {@attach attachDroppable}
>
  <header
    class={cn(
      'rounded-t-surface flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold',
      cardToneClasses(ui?.tone ?? 'neutral').dot,
    )}
  >
    <h2 class="flex min-w-0 items-center gap-2">
      {#if Icon}
        <Icon aria-hidden="true" class="size-4 shrink-0" />
      {/if}
      <span class="truncate">{data.title}</span>
    </h2>
    <span class="flex shrink-0 items-center gap-1">
      <span class="tabular-nums" aria-label={`${data.count} itens`}>{data.count}</span>
      {#if actions?.onEdit}
        <button
          type="button"
          onclick={actions.onEdit}
          aria-label={`Editar ${data.title}`}
          class="rounded-control focus-visible:ring-ring inline-flex size-7 items-center justify-center focus-visible:ring-2 focus-visible:outline-none"
        >
          <Pencil aria-hidden="true" class="size-3.5" />
        </button>
      {/if}
    </span>
  </header>
  <div class="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
    {@render children?.()}
    {#if actions?.onAdd}
      <button
        type="button"
        onclick={actions.onAdd}
        class="border-input text-ink-500 hover:bg-accent hover:text-foreground rounded-control control-md flex items-center justify-center gap-1.5 border-2 border-dashed text-sm font-medium transition-colors"
      >
        <Plus aria-hidden="true" class="size-4" />
        {ui?.addLabel ?? 'Adicionar'}
      </button>
    {/if}
  </div>
</section>
