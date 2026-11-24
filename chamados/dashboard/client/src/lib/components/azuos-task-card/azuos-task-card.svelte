<!--
  @component
  A TAREFA EM CARD — sobre o cartão padrão do sistema (`AzuosRecordCard`), o mesmo formato do
  card de computador e do de empresa do Paralegal.

  Na faixa: a situação e a origem; o selo vermelho pulsando quando atrasada. No corpo: o título,
  o prazo e as caixinhas de etapas e vínculos. No rodapé: o responsável com foto e o "Abrir".
  Finalizar, reabrir e apagar ficam no menu de três pontinhos.

  - `data.task`, `data.now` (o relógio da tela).
  - `actions`: `onOpen`, `onMove` (finalizar/reabrir) e `onRemove` (só a tarefa manual).
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskCardProps = {
    data: { task: Task; now?: Date };
    actions: {
      onOpen: (task: Task) => void;
      onMove: (task: Task, status: 'done' | 'reopened') => void;
      onRemove: (task: Task) => void;
      onRestore?: (task: Task) => void;
    };
  };
</script>

<script lang="ts">
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import Ticket from '@lucide/svelte/icons/ticket';
  import Wrench from '@lucide/svelte/icons/wrench';
  import {
    TASK_ORIGIN_LABELS,
    TASK_STATUS_TONES,
  } from '@template/shared/domain/task-flow.util';

  import RecordCard from '$lib/components/azuos-record-card/azuos-record-card.svelte';
  import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
  import { taskDueBadge } from '$lib/utils/task-due.util';
  import { situationOf } from '$lib/utils/task-stage.util';

  let { data, actions }: AzuosTaskCardProps = $props();

  const task = $derived(data.task);
  const due = $derived(taskDueBadge(task, data.now));
  const icon = $derived(task.origin === 'ticket' ? Ticket : task.origin === 'maintenance' ? Wrench : ClipboardCheck);
  const ownerName = $derived(task.owner?.name ?? 'Sem responsável');

  /* A tarefa de chamado se move pelo chamado; a arquivada fica parada. Excluir ARQUIVA, de qualquer
     origem, e a arquivada volta pelo Desarquivar (como no Paralegal). */
  const menuItems = $derived(task.archive ? [{ id: 'restore', label: 'Desarquivar' }] : activeMenu(task));

  function activeMenu(item: Task) {
    const move =
      item.origin === 'ticket'
        ? []
        : [item.status === 'done' ? { id: 'reopen', label: 'Reabrir' } : { id: 'finish', label: 'Finalizar' }];

    return [...move, { id: 'remove', label: 'Arquivar', isDestructive: true }];
  }

  function select(id: string): void {
    if (id === 'finish') actions.onMove(task, 'done');
    if (id === 'reopen') actions.onMove(task, 'reopened');
    if (id === 'remove') actions.onRemove(task);
    if (id === 'restore') actions.onRestore?.(task);
  }
</script>

<RecordCard
  data={{
    label: `Abrir a tarefa ${task.title}`,
    title: task.title,
    code: task.ticketId ? formatTicketProtocol(task.ticketId) : null,
    meta: due?.label ?? 'Sem prazo',
    status: { label: situationOf(task).label, tone: situationOf(task).tone },
    tags: [{ label: TASK_ORIGIN_LABELS[task.origin], tone: null }],
    alert: due?.tone === 'danger' ? { count: 1, message: 'Tarefa atrasada' } : null,
    metrics: [
      { key: 'steps', label: 'Etapas', value: `${task.progress.done}/${task.progress.total}` },
      { key: 'links', label: 'Vínculos', value: String(task.links.length) },
      { key: 'people', label: 'Pessoas', value: String(task.people.length + (task.owner ? 1 : 0)) },
    ],
    footer: {
      title: ownerName,
      subtitle: task.description ? task.description.slice(0, 80) : null,
      /* Sem responsável não é uma pessoa: sem rosto, para não parecer alguém chamado "SR". */
      person: task.owner ? { id: task.owner.id, name: ownerName, avatarUrl: task.owner.avatarUrl } : null,
    },
    openLabel: 'Abrir',
    menu: menuItems.length ? { label: `Ações da tarefa ${task.title}`, items: menuItems } : null,
  }}
  ui={{ icon, iconTone: TASK_STATUS_TONES[task.status], slot: 'task-card' }}
  actions={{ onOpen: () => actions.onOpen(task), onMenuSelect: select }}
/>
