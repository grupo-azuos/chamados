import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceScheduleDialog from './azuos-maintenance-schedule-dialog.svelte';

function props(over: { mode?: 'create' | 'edit'; dateError?: string | null; error?: string | null } = {}) {
  return {
    data: {
      mode: over.mode ?? ('create' as const),
      machineName: 'Contábil — fechamento',
      fields: {
        scheduledFor: { value: '2026-11-05', error: over.dateError ?? null },
        note: { value: '', error: null },
      },
    },
    state: { isOpen: true, error: over.error ?? null },
    actions: { onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn() },
  };
}

describe('AzuosMaintenanceScheduleDialog', () => {
  // feliz
  it('schedules the machine named in the dialog', async () => {
    const user = userEvent.setup();
    const input = props();
    render(MaintenanceScheduleDialog, { props: input });

    expect(screen.getByText(/Contábil — fechamento/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agendar' }));

    expect(input.actions.onSubmit).toHaveBeenCalledOnce();
  });

  it('speaks of rescheduling when there is already a date', () => {
    render(MaintenanceScheduleDialog, { props: props({ mode: 'edit' }) });

    expect(screen.getByText('Remarcar manutenção')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remarcar' })).toBeInTheDocument();
  });

  // triste
  it('shows why the date was refused and what the server said', () => {
    render(MaintenanceScheduleDialog, {
      props: props({ dateError: 'Escolha hoje ou um dia depois de hoje', error: 'Máquina fora de uso.' }),
    });

    expect(screen.getByText('Escolha hoje ou um dia depois de hoje')).toBeInTheDocument();
    expect(screen.getByText('Máquina fora de uso.')).toBeInTheDocument();
  });
});
