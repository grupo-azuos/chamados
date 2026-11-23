import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EventCalendar, { contrastColorOf } from './azuos-event-calendar.svelte';

const EVENTS = [
  { id: 'a', title: 'Reunião de equipe', start: '2026-11-23T09:00', end: '2026-11-23T10:00' },
  { id: 'b', title: 'Entrega do relatório', start: '2026-11-25', color: '#ffd60a' },
  { id: 'h', title: 'Proclamação da República', start: '2026-11-15', kind: 'holiday' as const },
];

function setup(actions = { onEventClick: vi.fn(), onDateClick: vi.fn(), onRangeChange: vi.fn() }) {
  render(EventCalendar, {
    props: {
      data: { events: EVENTS, initialDate: '2026-11-23' },
      ui: { ariaLabel: 'Calendário' },
      actions,
    },
  });
  return actions;
}

describe('AzuosEventCalendar', () => {
  // feliz
  it('opens on the month, reports the period and opens the event', async () => {
    const actions = setup();

    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
    expect(screen.getByText('Proclamação da República')).toBeInTheDocument();
    expect(actions.onRangeChange).toHaveBeenCalledWith({
      view: 'month',
      from: '2026-11-01',
      to: '2026-12-05',
      anchor: '2026-11-23',
    });
    await userEvent.click(screen.getByRole('button', { name: /Entrega do relatório/ }));
    expect(actions.onEventClick).toHaveBeenCalledWith('b');
  });

  // feliz
  it('opens a day from its number and shows the hour grid', async () => {
    const actions = setup();

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir segunda-feira, 23 de novembro' }),
    );

    expect(actions.onDateClick).toHaveBeenCalledWith('2026-11-23');
    expect(
      screen.getByRole('heading', { name: 'segunda-feira, 23 de novembro de 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('09:00', { selector: 'span.font-semibold' })).toBeInTheDocument();
  });

  // feliz
  it('switches to week, list and year', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.getByRole('heading', { name: '22 – 28 de nov. de 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByText('Feriado · Proclamação da República')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ano' }));
    await userEvent.click(screen.getByRole('button', { name: 'março' }));
    expect(screen.getByRole('heading', { name: 'março de 2026' })).toBeInTheDocument();
  });

  // triste
  it('shows an empty month in the list and does not step out of the valid range', async () => {
    render(EventCalendar, {
      props: {
        data: {
          events: [],
          initialDate: '2026-11-23',
          validRange: { from: '2026-11-01', to: '2026-11-30' },
        },
        ui: { ariaLabel: 'Calendário', views: ['list'] },
      },
    });

    expect(screen.getByText('Nada neste mês.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo: lista' })).toBeDisabled();
    expect(
      screen.queryByRole('group', { name: 'Visualização do calendário' }),
    ).not.toBeInTheDocument();
    expect(contrastColorOf('#ffd60a')).toBe('var(--foreground)');
    expect(contrastColorOf('#1d4ed8')).toBe('var(--primary-foreground)');
    expect(contrastColorOf('var(--success)')).toBe('var(--primary-foreground)');
  });
});
