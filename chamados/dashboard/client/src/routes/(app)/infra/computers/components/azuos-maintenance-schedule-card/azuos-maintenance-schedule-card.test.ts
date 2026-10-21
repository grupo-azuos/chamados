import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceScheduleCard, { scheduleSummaryOf } from './azuos-maintenance-schedule-card.svelte';

const NOW = new Date(2026, 9, 21, 9, 0);
const DAY = 24 * 60 * 60 * 1000;

function schedule(over: Partial<MaintenanceSchedule> = {}): MaintenanceSchedule {
  return {
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: null,
    computerDepartment: null,
    scheduledFor: '2026-11-05',
    note: 'Trocar pasta térmica',
    createdAt: '2026-10-21T12:00:00.000Z',
    createdBy: 'suporte@teste.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const actions = () => ({ onSchedule: vi.fn(), onCancel: vi.fn(), onRegister: vi.fn() });

describe('scheduleSummaryOf', () => {
  // feliz
  it('puts the scheduled day ahead of the automatic preventive', () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY).toISOString();

    expect(scheduleSummaryOf(schedule(), tenDaysAgo, NOW)).toEqual({
      title: 'Manutenção agendada',
      date: '05/11/2026',
      countdown: 'faltam 15 dias',
      tone: 'info',
    });
  });

  it('falls back to the three-month preventive when nothing is scheduled', () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY).toISOString();
    const summary = scheduleSummaryOf(null, tenDaysAgo, NOW);

    expect(summary.title).toBe('Próxima preventiva');
    expect(summary.countdown).toBe('faltam 82 dias');
    expect(summary.tone).toBe('neutral');
  });

  // triste
  it('turns a missed scheduled day red', () => {
    const summary = scheduleSummaryOf(schedule({ scheduledFor: '2026-10-18' }), null, NOW);

    expect(summary.countdown).toBe('atrasada há 3 dias');
    expect(summary.tone).toBe('danger');
  });

  it('has no date when the machine was never serviced nor scheduled', () => {
    expect(scheduleSummaryOf(null, null, NOW)).toMatchObject({
      title: 'Nenhuma preventiva registrada',
      date: null,
    });
  });
});

describe('AzuosMaintenanceScheduleCard', () => {
  // feliz
  it('offers to reschedule, cancel or register when there is a schedule', async () => {
    const user = userEvent.setup();
    const handlers = actions();
    render(MaintenanceScheduleCard, {
      props: { data: { schedule: schedule(), lastPreventiveAt: null }, actions: handlers },
    });

    expect(screen.getByText('Trocar pasta térmica')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    await user.click(screen.getByRole('button', { name: 'Remarcar' }));

    expect(handlers.onCancel).toHaveBeenCalledOnce();
    expect(handlers.onSchedule).toHaveBeenCalledOnce();
  });

  // triste
  it('offers only to schedule when nothing is scheduled', () => {
    render(MaintenanceScheduleCard, {
      props: { data: { schedule: null, lastPreventiveAt: null }, actions: actions() },
    });

    expect(screen.getByText(/Nenhuma preventiva registrada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agendar manutenção' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar agendamento' })).not.toBeInTheDocument();
  });
});
