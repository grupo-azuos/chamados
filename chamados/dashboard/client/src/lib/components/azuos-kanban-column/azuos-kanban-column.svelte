<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * UMA COLUNA DE QUADRO (kanban): título com contagem, os cartões e o "Adicionar" no fim.
   *
   * Genérica: não sabe se o cartão é chamado ou projeto. Recebe os cartões prontos em `children`
   * e avisa `onDropItem` com o identificador do cartão solto nela (ver `drag-item.util.ts`) —
   * quem decide o que "mover para esta coluna" significa é a tela.
   *
   * O destaque enquanto um cartão passa por cima é estado PURAMENTE visual, e por isso mora aqui.
   * O cabeçalho é pintado inteiro na cor da etapa (fundo, nunca borda colorida).
   */
  export type AzuosKanbanColumnTone = 'neutral' | 'info' | 'warning' | 'brand' | 'success' | 'danger';

  export type AzuosKanbanColumnProps = {
    data: { title: string; count: number };
    ui?: { tone?: AzuosKanbanColumnTone; addLabel?: string; className?: string };
    actions?: { onDropItem?: (id: number) => void; onAdd?: () => void };
    children?: Snippet;
  };

  export const KANBAN_TONE_HEADER: Record<AzuosKanbanColumnTone, string> = {
    neutral: 'bg-muted text-foreground',
    info: 'bg-info text-primary-foreground',
    warning: 'bg-warning text-primary-foreground',
    brand: 'bg-primary text-primary-foreground',
    success: 'bg-success text-primary-foreground',
    danger: 'bg-destructive text-destructive-foreground',
  };
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';

  import { readDragItem } from '$lib/utils/drag-item.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, actions, children }: AzuosKanbanColumnProps = $props();

  let isOver = $state(false);
  const canDrop = $derived(Boolean(actions?.onDropItem));

  function handleDragOver(event: DragEvent) {
    if (!canDrop) return;
    event.preventDefault();
    isOver = true;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isOver = false;
    if (!event.dataTransfer) return;
    const id = readDragItem({ dataTransfer: event.dataTransfer });
    if (id !== null) actions?.onDropItem?.(id);
  }
</script>

<section
  aria-label={data.title}
  class={cn(
    'bg-mantle rounded-surface flex w-72 shrink-0 flex-col sm:w-80',
    isOver && 'bg-accent',
    ui?.className,
  )}
  ondragover={handleDragOver}
  ondragleave={() => (isOver = false)}
  ondrop={handleDrop}
>
  <header
    class={cn(
      'rounded-t-surface flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold',
      KANBAN_TONE_HEADER[ui?.tone ?? 'neutral'],
    )}
  >
    <h2 class="truncate">{data.title}</h2>
    <span class="tabular-nums" aria-label={`${data.count} itens`}>{data.count}</span>
  </header>
  <div class="flex min-h-48 flex-col gap-2 p-3">
    {@render children?.()}
    {#if actions?.onAdd}
      <button
        type="button"
        onclick={actions.onAdd}
        class="border-input text-ink-500 hover:bg-accent hover:text-foreground rounded-control control-lg flex items-center justify-center gap-1.5 border-2 border-dashed text-sm font-medium transition-colors"
      >
        <Plus aria-hidden="true" class="size-4" />
        {ui?.addLabel ?? 'Adicionar'}
      </button>
    {/if}
  </div>
</section>
