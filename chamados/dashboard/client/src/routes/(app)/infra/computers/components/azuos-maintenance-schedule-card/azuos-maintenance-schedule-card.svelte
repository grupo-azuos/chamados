<!--
  @component
  O PRÓXIMO COMPROMISSO de manutenção da máquina, no alto da ficha.

  Agendamento ganha da preventiva automática: quem marcou um dia já decidiu quando abrir a máquina,
  e mostrar os dois deixaria a pessoa sem saber qual vale. Sem agendamento, o cartão mostra o prazo
  dos três meses (ou avisa que não há preventiva registrada) — e é dali que se agenda. A regra de
  qual prazo vale mora em `scheduleSummaryOf`; a urgência fica no ícone cheio, no tom do assunto,
  nunca no fundo do card. Com agendamento, as ações são registrar, remarcar e cancelar.

  - `data`: `schedule` (ou nulo) e `lastPreventiveAt` (de onde sai o prazo automático).
  - `state`: `isLoading`, `isCancelling` e `error`.
  - `actions`: `onSchedule` (agendar ou remarcar), `onCancel` e `onRegister`.
-->
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

  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

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

  /* Padrão Apple: o card fica na superfície, sem fundo nem borda coloridos — a urgência do
     prazo mora no ícone cheio, no tom do assunto. */
  const ICON_TONES: Record<ScheduleSummary['tone'], AzuosCardTone> = {
    danger: 'danger',
    warning: 'warning',
    info: 'info',
    neutral: 'brand',
  };
</script>

<script lang="ts">
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';

  let { data, state: cardState, actions }: AzuosMaintenanceScheduleCardProps = $props();

  const summary = $derived(scheduleSummaryOf(data.schedule, data.lastPreventiveAt));

  /* A linha de apoio: a data e quanto falta; sem prazo, o aviso de que já está pendente. */
  const meta = $derived.by(() => {
    if (cardState?.isLoading) return 'Conferindo a agenda da máquina…';
    if (summary.date) return `${summary.date} · ${summary.countdown}`;

    return data.schedule ? null : 'Esta máquina já aparece como pendente no quadro de preventivas.';
  });
</script>

<!-- O card de conteúdo da casa: o ícone cheio carrega a urgência (no tom), o título diz qual prazo
     vale, a linha de apoio diz quando, e as ações moram no rodapé. -->
<ContentCard
  data={{
    label: 'Próxima manutenção',
    title: cardState?.isLoading ? 'Próxima manutenção' : summary.title,
    meta,
  }}
  ui={{ icon: CalendarClock, iconTone: ICON_TONES[summary.tone], slot: 'maintenance-schedule-card' }}
>
  {#snippet notes()}
    {#if !cardState?.isLoading && data.schedule?.note}
      <p class="text-ink-700 text-xs break-words">{data.schedule.note}</p>
    {/if}
    {#if cardState?.error}
      <ErrorState data={{ message: cardState.error }} ui={{ variant: 'inline' }} />
    {/if}
  {/snippet}
  {#snippet footerActions()}
    {#if !cardState?.isLoading}
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
    {/if}
  {/snippet}
</ContentCard>
