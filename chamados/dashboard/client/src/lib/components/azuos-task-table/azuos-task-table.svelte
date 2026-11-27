<!--
  @component
  A LISTA DE TAREFAS EM TABELA — a `AzuosTable` da casa, o par da grade de cards na troca
  tabela/cards do sistema (`AzuosTableViewToggle`). Antes cada tarefa era uma linha desenhada à mão
  (um botão com fundo de card); agora é linha de tabela, com as mesmas colunas de sempre: a tarefa
  (situação e origem embaixo), o responsável com a foto, o prazo e as etapas.

  O título é o botão que abre a ficha. Finalizar, reabrir, arquivar e desarquivar ficam no menu de
  três pontinhos — o mesmo do card (`taskMenuItems`), nunca botões enfileirados na linha.

  - `data.tasks`, `data.now` (o relógio da tela: a hora decide "atrasada").
  - `actions`: as mesmas do card (`onOpen`, `onMove`, `onRemove`, `onRestore`).
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  import { type AzuosTaskCardProps } from '$lib/components/azuos-task-card/azuos-task-card.svelte';

  export type AzuosTaskTableProps = {
    data: { tasks: Task[]; now?: Date };
    actions: AzuosTaskCardProps['actions'];
  };
</script>

<script lang="ts">
  import { TASK_ORIGIN_LABELS, TASK_STATUS_TONES } from '@template/shared/domain/task-flow.util';

  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import ProgressBar from '$lib/components/azuos-progress-bar/azuos-progress-bar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';
  import { runTaskMenu, taskMenuItems } from '$lib/components/azuos-task-card/azuos-task-card.svelte';
  import OwnerAvatar from '$lib/components/azuos-task-owner-avatar/azuos-task-owner-avatar.svelte';
  import { taskDueBadge, taskPercentage } from '$lib/utils/task-due.util';
  import { situationOf } from '$lib/utils/task-stage.util';

  let { data, actions }: AzuosTaskTableProps = $props();

  function ownerNameOf(task: Task): string {
    if (task.owner) return task.owner.name ?? 'Fora do diretório';

    return 'Sem responsável';
  }
</script>

<Table class="min-w-[880px]" aria-label="Lista de tarefas">
  <TableHeader>
    <TableRow>
      <TableHead>Tarefa</TableHead>
      <TableHead class="w-52">Responsável</TableHead>
      <TableHead class="w-48">Prazo</TableHead>
      <TableHead class="w-44">Etapas</TableHead>
      <TableHead class="w-14 text-right"><span class="sr-only">Ações</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each data.tasks as task (task.id)}
      {@const due = taskDueBadge(task, data.now)}
      {@const situation = situationOf(task)}
      <TableRow>
        <TableCell>
          <button
            type="button"
            aria-label={`Abrir a tarefa ${task.title}`}
            class="text-foreground hover:text-primary focus-visible:ring-ring/50 rounded-control text-left font-medium break-words hover:underline focus-visible:ring-3 focus-visible:outline-none"
            onclick={() => actions.onOpen(task)}
          >
            {task.title}
          </button>
          <span class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge
              data={{ label: situation.label }}
              ui={{ tone: TASK_STATUS_TONES[task.status], color: situation.color, icon: situation.icon, size: 'sm' }}
            />
            <span>{TASK_ORIGIN_LABELS[task.origin]}</span>
            {#if task.links.length > 0}
              <span>{task.links.length} {task.links.length === 1 ? 'vínculo' : 'vínculos'}</span>
            {/if}
          </span>
        </TableCell>
        <TableCell>
          <span class="flex min-w-0 items-center gap-2">
            <OwnerAvatar owner={task.owner} />
            <span class="truncate">{ownerNameOf(task)}</span>
          </span>
        </TableCell>
        <TableCell>
          {#if due}
            <StatusBadge data={{ label: due.label }} ui={{ tone: due.tone, size: 'sm' }} />
          {:else}
            <span class="text-muted-foreground">Sem prazo</span>
          {/if}
        </TableCell>
        <TableCell>
          <ProgressBar
            data={{ percentage: taskPercentage(task), done: task.progress.done, total: task.progress.total }}
            ui={{ showCount: true, itemLabel: 'etapas', emptyLabel: 'Sem etapas' }}
          />
        </TableCell>
        <TableCell class="text-right">
          <ActionMenu
            data={{ label: `Ações da tarefa ${task.title}`, items: taskMenuItems(task) }}
            ui={{ isIconOnly: true }}
            actions={{ onSelect: (id) => runTaskMenu(id, task, actions) }}
          />
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
