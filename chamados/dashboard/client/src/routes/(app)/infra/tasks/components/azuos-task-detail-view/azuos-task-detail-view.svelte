<!--
  @component
  UMA TAREFA (a página, no formato do Paralegal) — o que fazer, quem faz e até quando; o FLUXO,
  com o que já foi concluído e quem concluiu (e "Personalizar" para montar as etapas); os
  VÍNCULOS, cada um levando à tela dele; e a LINHA DO TEMPO, com o nome de quem mexeu em cada coisa.

  As ações seguem a régua: a tarefa de chamado mostra "Abrir o chamado" no lugar de finalizar (ela
  acompanha o chamado); a de manutenção e a manual finalizam e reabrem; só a manual se exclui.
  Marcar a última etapa finaliza a tarefa sozinho.

  - `data`: `task`, `timeline`, `stepsDraft`, `now`, `backDestination`.
  - `state`: `isLoading`, `isHistoryLoading`, `isBusy`, `error`, `actionError`.
  - `actions`: `onFinish`, `onReopen`, `onToggleStep`, `onEditSteps`, `onStepsChange`,
    `onSaveSteps`, `onCancelSteps`, `onEdit`, `onRemoveLink`, `onRemove`, `onBack`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  import { type StepDraft } from '$lib/hooks/use-task-detail/use-task-detail.svelte';
  import { type TaskTimelineEntry } from '$lib/utils/task-history.util';

  export type AzuosTaskDetailViewProps = {
    data: {
      task: Task | null;
      timeline: TaskTimelineEntry[];
      stepsDraft: StepDraft[] | null;
      now?: Date;
      /** O destino do "voltar" ("o mapa", quando veio de lá). @default 'as tarefas' */
      backDestination?: string;
    };
    state: {
      isLoading: boolean;
      isHistoryLoading: boolean;
      isBusy: boolean;
      error: string | null;
      actionError: string | null;
    };
    actions: {
      onFinish: () => void;
      onReopen: () => void;
      onToggleStep: (stepId: number, done: boolean) => void;
      onEditSteps: () => void;
      onStepsChange: (steps: StepDraft[]) => void;
      onSaveSteps: () => void;
      onCancelSteps: () => void;
      onEdit: () => void;
      onRemoveLink: (linkId: number) => void;
      onRemove: () => void;
      /** O "voltar" pelo caminho da pessoa. Sem ele, o voltar é um link para as Tarefas. */
      onBack?: () => void;
    };
  };
</script>

<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Link2 from '@lucide/svelte/icons/link-2';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import {
    TASK_LINK_KIND_LABELS,
    TASK_ORIGIN_LABELS,
    TASK_STATUS_LABELS,
    TASK_STATUS_TONES,
  } from '@template/shared/domain/task-flow.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BackButton from '$lib/components/azuos-back-button/azuos-back-button.svelte';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import PanelCard from '$lib/components/azuos-panel-card/azuos-panel-card.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { moved } from '$lib/hooks/use-task-detail/use-task-detail.svelte';
  import { formatDay, taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';
  import { linkHref } from '$lib/utils/task-map.util';
  import TaskHistory from '../azuos-task-history/azuos-task-history.svelte';

  let { data, state: viewState, actions }: AzuosTaskDetailViewProps = $props();

  const DUE_TONE = { danger: 'danger', warning: 'warning', neutral: 'neutral' } as const;

  function changeStep(steps: StepDraft[], index: number, label: string): StepDraft[] {
    return steps.map((step, at) => (at === index ? { ...step, label } : step));
  }
</script>

{#snippet fact(label: string, value: string)}
  <div class="flex flex-col gap-1">
    <dt class="text-muted-foreground">{label}</dt>
    <dd class="text-foreground">{value}</dd>
  </div>
{/snippet}

<section class="flex flex-col gap-6 p-6">
  <BackButton
    data={{ destination: data.backDestination ?? 'as tarefas', to: actions.onBack ? undefined : '/infra/tasks' }}
    actions={actions.onBack ? { onClick: actions.onBack } : undefined}
  />

  {#if viewState.isLoading}
    <LoadingState data={{ label: 'Carregando a tarefa…' }} />
  {:else if viewState.error || !data.task}
    <ErrorState data={{ message: viewState.error ?? 'Tarefa não encontrada.' }} ui={{ variant: 'inline' }} />
  {:else}
    {@const task = data.task}
    {@const due = taskDueBadge(task, data.now)}
    {@const isDone = task.status === 'done'}
    <header class="rounded-surface bg-card shadow-card flex flex-col gap-4 p-4">
      <div class="flex flex-wrap items-start gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <h1 class="text-foreground text-xl font-semibold">{task.title}</h1>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge data={{ label: TASK_STATUS_LABELS[task.status] }} ui={{ tone: TASK_STATUS_TONES[task.status] }} />
            {#if due}<StatusBadge data={{ label: due.label }} ui={{ tone: DUE_TONE[due.tone] }} />{/if}
            <span class="text-muted-foreground">{TASK_ORIGIN_LABELS[task.origin]}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if task.origin === 'ticket' && task.ticketId}
            <!-- A tarefa do chamado acompanha o chamado: quem finaliza é ele. -->
            <a
              href={`/infra/tickets/${task.ticketId}`}
              class="control-md rounded-button bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 px-4 text-sm font-semibold"
            >
              <ExternalLink aria-hidden="true" class="size-4" /> Abrir o chamado
            </a>
          {:else}
            <ActionButton
              data={{ label: isDone ? 'Reabrir' : 'Finalizar' }}
              ui={{ icon: isDone ? RotateCcw : CheckCircle2, variant: isDone ? 'secondary' : 'primary' }}
              state={{ isDisabled: viewState.isBusy }}
              actions={{ onClick: isDone ? actions.onReopen : actions.onFinish }}
            />
          {/if}
          <ActionButton
            data={{ label: 'Editar' }}
            ui={{ icon: Pencil, variant: 'secondary' }}
            state={{ isDisabled: viewState.isBusy }}
            actions={{ onClick: actions.onEdit }}
          />
          {#if task.origin === 'manual'}
            <ActionButton
              data={{ label: 'Excluir' }}
              ui={{ icon: Trash2, variant: 'ghost' }}
              state={{ isDisabled: viewState.isBusy }}
              actions={{ onClick: actions.onRemove }}
            />
          {/if}
        </div>
      </div>
      <dl class="grid gap-3 text-sm sm:grid-cols-3">
        <div class="flex flex-col gap-1">
          <dt class="text-muted-foreground">Responsável</dt>
          <dd class="text-foreground flex items-center gap-2">
            {#if task.owner}
              <PersonAvatar
                name={task.owner.name ?? 'Sem cadastro'}
                avatarUrl={task.owner.avatarUrl}
                personId={task.owner.id}
                ui={{ size: 'sm' }}
              />
              {task.owner.name ?? 'Sem cadastro'}
            {:else}
              Sem responsável
            {/if}
          </dd>
        </div>
        {@render fact('Início', formatDay(task.startDate))}
        {@render fact('Criada por', task.createdBy?.name ?? 'Sistema')}
      </dl>
      {#if task.people.length > 0}
        <div class="flex flex-col gap-1 text-sm">
          <span class="text-muted-foreground">Participantes</span>
          <ul aria-label="Participantes" class="flex flex-wrap gap-x-4 gap-y-2">
            {#each task.people as person (person.id)}
              <li class="text-foreground flex items-center gap-2">
                <PersonAvatar
                  name={person.name ?? 'Sem cadastro'}
                  avatarUrl={person.avatarUrl}
                  personId={person.id}
                  ui={{ size: 'sm' }}
                />
                {person.name ?? 'Sem cadastro'}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if task.description}
        <p class="text-foreground text-sm whitespace-pre-line">{task.description}</p>
      {/if}
    </header>

    {#if viewState.actionError}
      <ErrorState data={{ message: viewState.actionError }} ui={{ variant: 'inline' }} />
    {/if}

    <div class="grid gap-6 xl:grid-cols-2">
      <div class="flex min-w-0 flex-col gap-6">
        <PanelCard data={{ title: 'Fluxo', hint: 'Marcar a última etapa finaliza a tarefa.' }}>
          {#snippet tools()}
            {#if !data.stepsDraft}
              <ActionButton
                data={{ label: 'Personalizar' }}
                ui={{ icon: Pencil, variant: 'ghost', size: 'sm' }}
                state={{ isDisabled: viewState.isBusy }}
                actions={{ onClick: actions.onEditSteps }}
              />
            {/if}
          {/snippet}
          <div class="flex flex-col gap-4">
            <ProgressBar
              data={{ percentage: taskPercentage(task), done: task.progress.done, total: task.progress.total }}
              ui={{ showCount: true, itemLabel: 'etapas', emptyLabel: 'Sem etapas' }}
            />
            {#if data.stepsDraft}
              {@const steps = data.stepsDraft}
              <div class="flex flex-col gap-3">
                <ol class="flex flex-col gap-2" aria-label="Etapas do fluxo">
                  {#each steps as step, index (step.id ?? `new-${index}`)}
                    <li class="flex items-end gap-2">
                      <TextField
                        data={{ label: `Etapa ${index + 1}`, name: `step-label-${index}`, value: step.label }}
                        ui={{ className: 'flex-1' }}
                        state={{ isDisabled: viewState.isBusy }}
                        actions={{ onChange: (label: string) => actions.onStepsChange(changeStep(steps, index, label)) }}
                      />
                      <ActionButton
                        data={{ label: 'Subir etapa' }}
                        ui={{ icon: ArrowUp, variant: 'ghost', isIconOnly: true, size: 'lg' }}
                        state={{ isDisabled: viewState.isBusy || index === 0 }}
                        actions={{ onClick: () => actions.onStepsChange(moved(steps, index, -1)) }}
                      />
                      <ActionButton
                        data={{ label: 'Descer etapa' }}
                        ui={{ icon: ArrowDown, variant: 'ghost', isIconOnly: true, size: 'lg' }}
                        state={{ isDisabled: viewState.isBusy || index === steps.length - 1 }}
                        actions={{ onClick: () => actions.onStepsChange(moved(steps, index, 1)) }}
                      />
                      <ActionButton
                        data={{ label: 'Tirar etapa' }}
                        ui={{ icon: Trash2, variant: 'ghost', isIconOnly: true, size: 'lg' }}
                        state={{ isDisabled: viewState.isBusy }}
                        actions={{ onClick: () => actions.onStepsChange(steps.filter((_, at) => at !== index)) }}
                      />
                    </li>
                  {/each}
                </ol>
                <div>
                  <ActionButton
                    data={{ label: 'Pôr etapa' }}
                    ui={{ icon: Plus, variant: 'secondary', size: 'sm' }}
                    state={{ isDisabled: viewState.isBusy }}
                    actions={{ onClick: () => actions.onStepsChange([...steps, { label: '' }]) }}
                  />
                </div>
                <div class="flex justify-end gap-2">
                  <ActionButton
                    data={{ label: 'Cancelar' }}
                    ui={{ variant: 'ghost' }}
                    state={{ isDisabled: viewState.isBusy }}
                    actions={{ onClick: actions.onCancelSteps }}
                  />
                  <ActionButton
                    data={{ label: 'Salvar fluxo', loadingLabel: 'Salvando…' }}
                    state={{ isLoading: viewState.isBusy }}
                    actions={{ onClick: actions.onSaveSteps }}
                  />
                </div>
              </div>
            {:else if task.steps.length === 0}
              <p class="text-muted-foreground text-sm">Sem etapas. Use "Personalizar" para montar o fluxo.</p>
            {:else}
              <ol class="flex flex-col gap-2" aria-label="Etapas">
                {#each task.steps as step (step.id)}
                  <li class="flex flex-wrap items-center gap-2">
                    <CheckboxField
                      data={{ label: step.label, name: `step-${step.id}`, isChecked: step.done }}
                      state={{ isDisabled: viewState.isBusy }}
                      actions={{ onChange: (done: boolean) => actions.onToggleStep(step.id, done) }}
                    />
                    {#if step.done && step.doneBy}
                      <span class="text-muted-foreground text-xs">feita por {step.doneBy.name ?? 'Sem cadastro'}</span>
                    {/if}
                  </li>
                {/each}
              </ol>
            {/if}
          </div>
        </PanelCard>

        <PanelCard data={{ title: 'Vínculos', hint: 'Clique para abrir. "Editar" vincula outros itens.' }}>
          {#snippet tools()}
            <ActionButton
              data={{ label: 'Vincular' }}
              ui={{ icon: Link2, variant: 'ghost', size: 'sm' }}
              state={{ isDisabled: viewState.isBusy }}
              actions={{ onClick: actions.onEdit }}
            />
          {/snippet}
          {#if task.links.length === 0}
            <EmptyState
              data={{ title: 'Sem vínculos', description: 'Vincule os chamados, computadores, peças e itens que esta tarefa toca.' }}
              ui={{ icon: ListChecks }}
            />
          {:else}
            <ul class="flex flex-col gap-1" aria-label="Vínculos">
              {#each task.links as link (link.id)}
                {@const label = link.label ?? TASK_LINK_KIND_LABELS[link.kind]}
                <li class="rounded-control hover:bg-hover-veil flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1">
                  <span class="text-muted-foreground text-xs">{TASK_LINK_KIND_LABELS[link.kind]}</span>
                  {#if link.label !== null}
                    <a href={linkHref(link)} class="text-primary min-w-0 flex-1 truncate text-sm hover:underline">{label}</a>
                  {:else}
                    <span class="text-muted-foreground min-w-0 flex-1 truncate text-sm">{label} — saiu do cadastro</span>
                  {/if}
                  <ActionButton
                    data={{ label: `Desvincular ${label}` }}
                    ui={{ icon: Trash2, variant: 'ghost', isIconOnly: true, size: 'sm' }}
                    state={{ isDisabled: viewState.isBusy }}
                    actions={{ onClick: () => actions.onRemoveLink(link.id) }}
                  />
                </li>
              {/each}
            </ul>
          {/if}
        </PanelCard>
      </div>

      <PanelCard data={{ title: 'Linha do tempo', hint: 'Cada mudança, com quem fez.' }}>
        <TaskHistory data={{ entries: data.timeline }} state={{ isLoading: viewState.isHistoryLoading }} />
      </PanelCard>
    </div>
  {/if}
</section>
