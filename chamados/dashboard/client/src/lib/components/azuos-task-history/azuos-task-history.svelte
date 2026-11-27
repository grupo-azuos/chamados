<!--
  @component
  A LINHA DO TEMPO DA TAREFA — cada mudança, com quem fez e quando, na linha do tempo do grupo
  (`AzuosTimeline` + `AzuosTimelineStep`): o que aconteceu no título do marco ("Mudou a situação da
  tarefa"), o rosto e o nome de quem fez com a hora, e embaixo a caixa cinza com o que mudou.

  - `data`: `entries` (já em frase — `taskTimelineOf`).
  - `state`: `isLoading`.
-->
<script lang="ts" module>
  import { type TaskTimelineEntry } from '$lib/utils/task-history.util';

  export type AzuosTaskHistoryProps = {
    data: { entries: TaskTimelineEntry[] };
    state?: { isLoading?: boolean };
  };

  /** O tom do marco: a linha do tempo do grupo tem quatro (o aviso fica no neutro). */
  export const STEP_TONES = {
    neutral: 'neutral',
    info: 'brand',
    brand: 'brand',
    success: 'success',
    warning: 'neutral',
    danger: 'danger',
  } as const;

  /** "17/11/2026 às 09:24" — sem os segundos, que ninguém lê numa linha do tempo. */
  export function formatHistoryDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
</script>

<script lang="ts">
  import History from '@lucide/svelte/icons/history';

  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import Timeline from '$lib/components/azuos-timeline/azuos-timeline.svelte';
  import TimelineStep from '$lib/components/azuos-timeline-step/azuos-timeline-step.svelte';

  let { data, state: historyState }: AzuosTaskHistoryProps = $props();
</script>

{#if historyState?.isLoading}
  <LoadingState data={{ label: 'Carregando a linha do tempo…' }} />
{:else if data.entries.length === 0}
  <p class="text-muted-foreground text-sm">Nada registrado ainda.</p>
{:else}
  <Timeline>
    {#each data.entries as entry, index (entry.id)}
      <TimelineStep
        data={{ title: entry.kindLabel, icon: History }}
        ui={{ isLast: index === data.entries.length - 1, tone: STEP_TONES[entry.tone] }}
      >
        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <PersonAvatar name={entry.authorName} ui={{ size: 'sm' }} />
          <span class="text-foreground min-w-0 truncate text-sm font-medium">{entry.authorName}</span>
          <time class="text-muted-foreground ml-auto text-xs tabular-nums" datetime={entry.createdAt}>
            {formatHistoryDateTime(entry.createdAt)}
          </time>
        </div>
        <p class="rounded-box bg-muted text-foreground px-3.5 py-2.5 text-sm whitespace-pre-line">
          {entry.lines.join('\n')}
        </p>
      </TimelineStep>
    {/each}
  </Timeline>
{/if}
