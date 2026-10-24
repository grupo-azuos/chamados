<script lang="ts" module>
  import {
    daysUntilDay,
    daysUntilPreventive,
    nextPreventiveAt,
    preventiveCountdownLabel,
    scheduleCountdownLabel,
    scheduleTone,
  } from '@template/shared/domain/maintenance.util';
  import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';

  /**
   * O PRÓXIMO COMPROMISSO de manutenção da máquina, no alto da ficha.
   *
   * Agendamento ganha da preventiva automática: quem marcou um dia já decidiu quando abrir a
   * máquina, e mostrar os dois deixaria a pessoa sem saber qual vale. Sem agendamento, o
   * cartão mostra o prazo dos três meses — e é dali que se agenda.
   */
  export type AzuosMaintenanceScheduleCardProps = {
    data: {
      schedule: MaintenanceSchedule | null;
      /** A última preventiva ou corretiva — é dela que sai o prazo automático. */
      lastPreventiveAt: string | null;
    };
    state?: { isLoading?: boolean; isCancelling?: boolean; error?: string | null };
    actions: {
      onSchedule: () => void;
      onCancel: () => void;
      onRegister: () => void;
    };
  };

  export type ScheduleSummary = {
    title: string;
    /** A data, já como a tela escreve. Nula quando não há prazo nenhum. */
    date: string | null;
    countdown: string | null;
    tone: 'danger' | 'warning' | 'info' | 'neutral';
  };

  const DAY_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

  /** `AAAA-MM-DD` → "05/11/2026", sem passar por fuso (ver `formatDay`). */
  function dayLabel(day: string): string {
    const [year, month, date] = day.split('-');

    return `${date}/${month}/${year}`;
  }

  /**
   * A leitura do cartão. Exportada para ter teste próprio: é aqui que mora a regra de qual
   * prazo vale, e ela não pode depender de abrir a tela para ser conferida.
   */
  export function scheduleSummaryOf(
    schedule: MaintenanceSchedule | null,
    lastPreventiveAt: string | null,
    now: Date = new Date(),
  ): ScheduleSummary {
    if (schedule) {
      const days = daysUntilDay(schedule.scheduledFor, now) ?? 0;

      return {
        title: 'Manutenção agendada',
        date: dayLabel(schedule.scheduledFor),
        countdown: scheduleCountdownLabel(days),
        tone: scheduleTone(days),
      };
    }

    const days = daysUntilPreventive(lastPreventiveAt, now.getTime());
    const next = nextPreventiveAt(lastPreventiveAt);
    if (days === null || !next) {
      return { title: 'Nenhuma preventiva registrada', date: null, countdown: null, tone: 'warning' };
    }

    return {
      title: 'Próxima preventiva',
      date: DAY_FORMAT.format(new Date(next)),
      countdown: preventiveCountdownLabel(days),
      tone: days <= 0 ? 'danger' : 'neutral',
    };
  }

  const TONE_CLASSES: Record<ScheduleSummary['tone'], string> = {
    danger: 'bg-destructive/10',
    warning: 'bg-warning-soft',
    info: 'bg-primary/5',
    neutral: 'bg-card',
  };
</script>

<script lang="ts">
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';

  let { data, state: cardState, actions }: AzuosMaintenanceScheduleCardProps = $props();

  const summary = $derived(scheduleSummaryOf(data.schedule, data.lastPreventiveAt));
</script>

<section
  aria-label="Próxima manutenção"
  class="rounded-surface flex flex-col gap-3 border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between {TONE_CLASSES[summary.tone]}"
  data-slot="maintenance-schedule-card"
>
  <div class="flex min-w-0 items-start gap-3">
    <CalendarClock class="text-ink-700 mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <div class="min-w-0">
      {#if cardState?.isLoading}
        <p class="text-ink-500 text-sm">Conferindo a agenda da máquina…</p>
      {:else}
        <p class="text-ink-900 text-sm break-words">
          <span class="font-semibold">{summary.title}{summary.date ? ':' : ''}</span>
          {#if summary.date}
            <span class="font-medium">{summary.date}</span>
            ·
            <span class={summary.tone === 'danger' ? 'text-destructive font-semibold' : 'font-medium'}>{summary.countdown}</span>
          {/if}
        </p>
        {#if data.schedule?.note}
          <p class="text-ink-700 mt-0.5 text-xs break-words">{data.schedule.note}</p>
        {:else if !data.schedule && summary.date === null}
          <p class="text-ink-700 mt-0.5 text-xs">
            Esta máquina já aparece como pendente no quadro de preventivas.
          </p>
        {/if}
      {/if}
    </div>
  </div>

  {#if !cardState?.isLoading}
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {#if data.schedule}
        <ActionButton
          data={{ label: 'Registrar manutenção' }}
          ui={{ variant: 'secondary', size: 'sm', icon: Wrench }}
          actions={{ onClick: actions.onRegister }}
        />
        <ActionButton
          data={{ label: 'Remarcar' }}
          ui={{ variant: 'secondary', size: 'sm' }}
          state={{ isDisabled: cardState?.isCancelling }}
          actions={{ onClick: actions.onSchedule }}
        />
        <ActionButton
          data={{ label: cardState?.isCancelling ? 'Cancelando…' : 'Cancelar agendamento' }}
          ui={{ variant: 'ghost', size: 'sm' }}
          state={{ isDisabled: cardState?.isCancelling }}
          actions={{ onClick: actions.onCancel }}
        />
      {:else}
        <ActionButton
          data={{ label: 'Agendar manutenção' }}
          ui={{ variant: 'secondary', size: 'sm', icon: CalendarClock }}
          actions={{ onClick: actions.onSchedule }}
        />
      {/if}
    </div>
  {/if}

  {#if cardState?.error}
    <div class="w-full">
      <ErrorState data={{ message: cardState.error }} ui={{ variant: 'inline' }} />
    </div>
  {/if}
</section>
