<!--
  @component
  A LINHA DO TEMPO DA TAREFA (a do Paralegal) — cada mudança, com quem fez e quando: o selo com o
  que aconteceu ("Mudou a situação da tarefa"), o nome de quem fez, a hora à direita e, embaixo, a
  caixa cinza com o que mudou. Um trilho liga os marcos de cima a baixo.

  - `data`: `entries` (já em frase — `taskTimelineOf`).
  - `state`: `isLoading`.
-->
<script lang="ts" module>
  import { type TaskTimelineEntry } from '$lib/utils/task-history.util';

  export type AzuosTaskHistoryProps = {
    data: { entries: TaskTimelineEntry[] };
    state?: { isLoading?: boolean };
  };

  /** "17/11/2026 às 09:24" — sem os segundos, que ninguém lê numa linha do tempo. */
  export function formatHistoryDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
</script>

<script lang="ts">
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: historyState }: AzuosTaskHistoryProps = $props();

  const DOT_TONE = {
    neutral: 'bg-muted-foreground',
    info: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    brand: 'bg-primary',
  } as const;
</script>

{#if historyState?.isLoading}
  <p class="text-muted-foreground text-sm">Carregando a linha do tempo…</p>
{:else if data.entries.length === 0}
  <p class="text-muted-foreground text-sm">Nada registrado ainda.</p>
{:else}
  <ol class="flex flex-col" aria-label="Linha do tempo">
    {#each data.entries as entry, index (entry.id)}
      {@const isLast = index === data.entries.length - 1}
      <li class="flex gap-4">
        <div class="flex w-3 shrink-0 flex-col items-center" aria-hidden="true">
          <span class={cn('h-0.5 w-px', index === 0 ? 'bg-transparent' : 'bg-border')}></span>
          <span class={cn('my-1 size-3 shrink-0 rounded-full', DOT_TONE[entry.tone])}></span>
          {#if !isLast}<span class="bg-border w-px flex-1"></span>{/if}
        </div>
        <div class={cn('flex min-w-0 flex-1 flex-col gap-2', isLast ? 'pb-0' : 'pb-6')}>
          <div class="flex min-h-6 flex-wrap items-center gap-x-2.5 gap-y-1">
            <StatusBadge data={{ label: entry.kindLabel }} ui={{ tone: entry.tone, size: 'sm' }} />
            <span class="text-foreground min-w-0 truncate text-sm leading-6 font-medium">{entry.authorName}</span>
            <time class="text-muted-foreground ml-auto text-xs leading-6 tabular-nums" datetime={entry.createdAt}>
              {formatHistoryDateTime(entry.createdAt)}
            </time>
          </div>
          <p class="rounded-box bg-muted text-foreground px-3.5 py-2.5 text-sm whitespace-pre-line">
            {entry.lines.join('\n')}
          </p>
        </div>
      </li>
    {/each}
  </ol>
{/if}
