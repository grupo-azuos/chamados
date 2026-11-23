<!--
  @component
  O CALENDÁRIO DAS TAREFAS — as tarefas no calendário do grupo (`AzuosEventCalendar`, o desenho da
  big-calendar: mês, semana, dia, lista e ano). Cada tarefa cai no dia do prazo (com a hora, quando
  tem), ou no do início quando não há prazo.

  A cor é a do prazo: atrasada vermelha, vencendo amarela, finalizada verde, o resto no azul da
  marca. Clicar abre a ficha; trocar de período avisa a tela para buscar as tarefas dele.

  - `data`: `tasks`, `month` (`aaaa-mm`, onde o calendário abre), `now`.
  - `actions`: `onOpen`, `onRangeChange`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  import { type AzuosCalendarEvent } from '$lib/components/azuos-event-calendar/azuos-event-calendar.svelte';
  import { type TaskRange } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import { taskDueBadge } from '$lib/utils/task-due.util';
  import { calendarDayOf } from './task-calendar.util';

  export type AzuosTaskCalendarProps = {
    data: { tasks: Task[]; month: string; now?: Date };
    actions: { onOpen: (task: Task) => void; onRangeChange: (range: TaskRange) => void };
  };

  const TONE_COLOR = {
    danger: { color: 'var(--destructive)', contrastColor: 'var(--destructive-foreground)' },
    warning: { color: 'var(--warning)', contrastColor: 'var(--warning-foreground)' },
    done: { color: 'var(--success)', contrastColor: 'var(--success-foreground)' },
    neutral: { color: 'var(--primary)', contrastColor: 'var(--primary-foreground)' },
  } as const;

  function toneOf(task: Task, now?: Date): keyof typeof TONE_COLOR {
    if (task.status === 'done') return 'done';
    const tone = taskDueBadge(task, now)?.tone;

    return tone === 'danger' || tone === 'warning' ? tone : 'neutral';
  }

  /** A tarefa como evento do calendário: o dia do prazo, com a hora quando ela tem. */
  export function taskEventOf(task: Task, now?: Date): AzuosCalendarEvent {
    const day = calendarDayOf(task);
    const start = task.dueDate && task.dueTime ? `${day}T${task.dueTime.slice(0, 5)}` : day;

    return { id: String(task.id), title: task.title, start, ...TONE_COLOR[toneOf(task, now)] };
  }
</script>

<script lang="ts">
  import EventCalendar from '$lib/components/azuos-event-calendar/azuos-event-calendar.svelte';
  import { toDay, todayDate } from '$lib/components/azuos-event-calendar/event-calendar.util';

  let { data, actions }: AzuosTaskCalendarProps = $props();

  /* No mês de hoje, abre em hoje (a semana e o dia caem onde a pessoa está); noutro, no dia 1. */
  const today = toDay(todayDate());
  const initialDate = $derived(today.startsWith(data.month) ? today : `${data.month}-01`);
  const events = $derived(data.tasks.map((task) => taskEventOf(task, data.now)));

  function open(id: string) {
    const task = data.tasks.find((item) => String(item.id) === id);
    if (task) actions.onOpen(task);
  }
</script>

<EventCalendar
  data={{ events, initialDate }}
  ui={{ ariaLabel: 'Calendário das tarefas' }}
  actions={{ onEventClick: open, onRangeChange: actions.onRangeChange }}
/>
