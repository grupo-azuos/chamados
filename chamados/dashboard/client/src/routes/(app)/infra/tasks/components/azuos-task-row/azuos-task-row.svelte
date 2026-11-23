<!--
  @component
  UMA LINHA DA LISTA DE TAREFAS — no formato do Paralegal: título com a situação, a origem e os
  vínculos embaixo; o responsável com foto; o selo do prazo; e a barra das etapas.

  A linha inteira abre a tarefa. Atrasada ganha o ponto vermelho pulsando ao lado do título (só
  com `motion-safe`), para chamar o olho sem esconder nada.

  - `data.task`: a tarefa, como a API devolve.
  - `data.now`: o relógio da tela (a hora decide "atrasada"); padrão é agora.
  - `actions.onOpen`: abre a ficha.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskRowProps = {
    data: { task: Task; now?: Date };
    actions: { onOpen: (task: Task) => void };
  };
</script>

<script lang="ts">
  import {
    TASK_ORIGIN_LABELS,
    TASK_STATUS_TONES,
  } from '@template/shared/domain/task-flow.util';

  import OwnerAvatar from '../azuos-task-owner-avatar/azuos-task-owner-avatar.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';
  import { situationOf } from '$lib/utils/task-stage.util';

  let { data, actions }: AzuosTaskRowProps = $props();

  const task = $derived(data.task);
  const due = $derived(taskDueBadge(task, data.now));
  const ownerName = $derived(task.owner?.name ?? (task.owner ? 'Fora do diretório' : 'Sem responsável'));
  const linkCount = $derived(task.links.length);
</script>

<button
  type="button"
  aria-label={`Abrir a tarefa ${task.title}`}
  class="rounded-surface bg-card shadow-card hover:bg-hover-veil focus-visible:ring-ring/50 grid w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
  onclick={() => actions.onOpen(task)}
>
  <span class="flex min-w-0 flex-col gap-1">
    <span class="flex min-w-0 items-center gap-2">
      {#if due?.tone === 'danger'}
        <span class="relative flex size-2 shrink-0" aria-hidden="true">
          <span class="bg-destructive absolute inline-flex size-full rounded-full motion-safe:animate-ping"></span>
          <span class="bg-destructive relative inline-flex size-2 rounded-full"></span>
        </span>
      {/if}
      <span class="text-foreground truncate font-medium">{task.title}</span>
    </span>
    <span class="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      <StatusBadge
        data={{ label: situationOf(task).label }}
        ui={{ tone: TASK_STATUS_TONES[task.status], color: situationOf(task).color, size: 'sm' }}
      />
      <span>{TASK_ORIGIN_LABELS[task.origin]}</span>
      {#if linkCount > 0}
        <span>{linkCount} {linkCount === 1 ? 'vínculo' : 'vínculos'}</span>
      {/if}
    </span>
  </span>
  <span class="text-foreground flex min-w-0 items-center gap-2 text-sm">
    <OwnerAvatar owner={task.owner} />
    <span class="truncate">{ownerName}</span>
  </span>
  <span class="text-sm">
    {#if due}
      <StatusBadge data={{ label: due.label }} ui={{ tone: due.tone, size: 'sm' }} />
    {:else}
      <span class="text-muted-foreground">Sem prazo</span>
    {/if}
  </span>
  <ProgressBar
    data={{ percentage: taskPercentage(task), done: task.progress.done, total: task.progress.total }}
    ui={{ showCount: true, itemLabel: 'etapas', emptyLabel: 'Sem etapas' }}
  />
</button>
