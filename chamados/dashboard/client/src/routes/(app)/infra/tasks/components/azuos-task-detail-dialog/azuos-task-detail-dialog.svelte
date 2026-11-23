<!--
  @component
  A FICHA DA TAREFA, num modal: o que é, de quem é, até quando, o checklist para marcar e os
  vínculos (cada um leva à tela dele quando ela existe).

  As ações seguem a régua: a tarefa de chamado mostra "Abrir o chamado" no lugar de finalizar
  (ela acompanha o chamado); a de manutenção e a manual finalizam e reabrem; só a manual se
  exclui. Marcar a última etapa finaliza sozinho.

  - `data`: `task`, `now`.
  - `state`: `isOpen`, `isBusy`, `error`.
  - `actions`: `onClose`, `onEdit`, `onMove`, `onToggleStep`, `onRemoveLink`, `onRemove`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskDetailDialogProps = {
    data: { task: Task; now?: Date };
    state: { isOpen: boolean; isBusy?: boolean; error?: string | null };
    actions: {
      onClose: () => void;
      onEdit: (task: Task) => void;
      onMove: (task: Task, status: 'done' | 'reopened') => void;
      onToggleStep: (task: Task, stepId: number, done: boolean) => void;
      onRemoveLink: (task: Task, linkId: number) => void;
      onRemove: (task: Task) => void;
    };
  };

  /** A tela de cada vinculado, quando existe. */
  export function linkHref(kind: Task['links'][number]['kind'], targetId: number): string | null {
    if (kind === 'ticket') return `/infra/tickets/${targetId}`;
    if (kind === 'computer') return `/infra/computers/${targetId}`;

    return null;
  }
</script>

<script lang="ts">
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import X from '@lucide/svelte/icons/x';
  import {
    TASK_LINK_KIND_LABELS,
    TASK_ORIGIN_LABELS,
    TASK_STATUS_LABELS,
    TASK_STATUS_TONES,
  } from '@template/shared/domain/task-flow.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import { formatDay, taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';

  let { data, state: dialogState, actions }: AzuosTaskDetailDialogProps = $props();

  const task = $derived(data.task);
  const due = $derived(taskDueBadge(task, data.now));
  const busy = $derived(Boolean(dialogState.isBusy));
</script>

<Dialog open={dialogState.isOpen} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}>
  <DialogContent class="sm:max-w-2xl">
    <div class="flex flex-col gap-5">
      <DialogHeader class="gap-2">
        <div class="flex items-start gap-2.5">
          <span class="rounded-chip bg-muted text-primary flex size-7 shrink-0 items-center justify-center">
            <ClipboardCheck class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg leading-snug font-semibold tracking-tight">{task.title}</DialogTitle>
        </div>
        <DialogDescription class="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge
            data={{ label: TASK_STATUS_LABELS[task.status] }}
            ui={{ tone: TASK_STATUS_TONES[task.status], size: 'sm' }}
          />
          <span class="text-muted-foreground">{TASK_ORIGIN_LABELS[task.origin]}</span>
          {#if due}
            <StatusBadge data={{ label: due.label }} ui={{ tone: due.tone, size: 'sm' }} />
          {/if}
        </DialogDescription>
      </DialogHeader>

      {#if task.description}
        <p class="rounded-box bg-muted text-foreground p-3 text-sm whitespace-pre-line">{task.description}</p>
      {/if}

      <dl class="grid gap-3 text-sm sm:grid-cols-3">
        <div class="flex flex-col gap-1">
          <dt class="text-muted-foreground text-xs">Responsável</dt>
          <dd class="flex items-center gap-2">
            <PersonAvatar name={task.owner?.name ?? 'Sem responsável'} avatarUrl={task.owner?.avatarUrl ?? null} ui={{ size: 'sm' }} />
            <span class="truncate">{task.owner?.name ?? 'Sem responsável'}</span>
          </dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="text-muted-foreground text-xs">Início</dt>
          <dd>{formatDay(task.startDate)}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="text-muted-foreground text-xs">Participantes</dt>
          <dd class="flex -space-x-1">
            {#each task.people as person (person.id)}
              <PersonAvatar name={person.name ?? 'Fora do diretório'} avatarUrl={person.avatarUrl} ui={{ size: 'sm', className: 'ring-2 ring-card' }} />
            {:else}
              <span class="text-muted-foreground">Ninguém</span>
            {/each}
          </dd>
        </div>
      </dl>

      <section class="flex flex-col gap-2" aria-label="Etapas">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-foreground text-sm font-semibold">Etapas</h3>
          <ProgressBar
            data={{ percentage: taskPercentage(task), done: task.progress.done, total: task.progress.total }}
            ui={{ showCount: true, itemLabel: 'etapas', emptyLabel: 'Sem etapas', className: 'w-48' }}
          />
        </div>
        {#if task.steps.length === 0}
          <p class="text-muted-foreground text-sm">Esta tarefa não tem etapas. Edite para escrever o roteiro.</p>
        {:else}
          <ul class="flex flex-col gap-1">
            {#each task.steps as step (step.id)}
              <li class="rounded-control hover:bg-hover-veil px-2 py-0.5">
                <CheckboxField
                  data={{ label: step.label, name: `task-step-${step.id}`, isChecked: step.done }}
                  ui={{ className: step.done ? '[&_label]:line-through [&_label]:text-muted-foreground' : undefined }}
                  state={{ isDisabled: busy }}
                  actions={{ onChange: (checked: boolean) => actions.onToggleStep(task, step.id, checked) }}
                />
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="flex flex-col gap-2" aria-label="Vínculos">
        <h3 class="text-foreground text-sm font-semibold">Vínculos</h3>
        {#if task.links.length === 0}
          <p class="text-muted-foreground text-sm">Nenhum vínculo. Edite para ligar chamados, computadores, peças ou itens.</p>
        {:else}
          <ul class="flex flex-wrap gap-1.5">
            {#each task.links as link (link.id)}
              {@const href = linkHref(link.kind, link.targetId)}
              <li class="rounded-chip bg-muted flex items-center gap-1 py-0.5 pr-1 pl-2.5 text-xs">
                <span class="text-muted-foreground">{TASK_LINK_KIND_LABELS[link.kind]}:</span>
                {#if href}
                  <a {href} class="text-primary max-w-48 truncate hover:underline">{link.label ?? `#${link.targetId}`}</a>
                {:else}
                  <span class="max-w-48 truncate">{link.label ?? `#${link.targetId}`}</span>
                {/if}
                <button
                  type="button"
                  aria-label={`Tirar o vínculo ${link.label ?? link.targetId}`}
                  class="hover:bg-hover-veil rounded-full p-0.5"
                  disabled={busy}
                  onclick={() => actions.onRemoveLink(task, link.id)}
                >
                  <X class="size-3" aria-hidden="true" />
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      {#if dialogState.error}
        <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter class="flex-wrap gap-2">
        {#if task.origin === 'manual'}
          <ActionButton
            data={{ label: 'Excluir' }}
            ui={{ variant: 'danger-soft' }}
            state={{ isDisabled: busy }}
            actions={{ onClick: () => actions.onRemove(task) }}
          />
        {/if}
        <ActionButton
          data={{ label: 'Editar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: busy }}
          actions={{ onClick: () => actions.onEdit(task) }}
        />
        {#if task.origin === 'ticket' && task.ticketId}
          <a
            href={`/infra/tickets/${task.ticketId}`}
            class="rounded-button bg-primary text-primary-foreground control-md inline-flex items-center px-4 text-sm font-semibold hover:bg-primary/90"
          >
            Abrir o chamado
          </a>
        {:else if task.status === 'done'}
          <ActionButton
            data={{ label: 'Reabrir' }}
            ui={{ variant: 'primary' }}
            state={{ isDisabled: busy }}
            actions={{ onClick: () => actions.onMove(task, 'reopened') }}
          />
        {:else}
          <ActionButton
            data={{ label: 'Finalizar' }}
            ui={{ variant: 'primary' }}
            state={{ isDisabled: busy }}
            actions={{ onClick: () => actions.onMove(task, 'done') }}
          />
        {/if}
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>
