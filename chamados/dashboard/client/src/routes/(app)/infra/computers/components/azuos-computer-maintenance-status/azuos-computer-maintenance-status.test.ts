import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ComputerMaintenanceStatus from './azuos-computer-maintenance-status.svelte';

const computer = { preventiveStatus: 'due' as const, lastPreventiveAt: '2020-01-01T12:00:00.000Z',
  activeAlerts: 2, isArchived: false, disposedAt: null };

describe('AzuosComputerMaintenanceStatus', () => {
  // feliz
  it('shows both maintenance needs rather than hiding one behind the other', () => {
    render(ComputerMaintenanceStatus, { props: { data: { computer } } });
    expect(screen.getByText('Preventiva vencida')).toBeInTheDocument();
    expect(screen.getByText('2 alertas críticos ativos')).toBeInTheDocument();
    expect(screen.getByText(/Última manutenção:/)).toBeInTheDocument();
  });

  it('tells how many days are left when the preventive is up to date', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    render(ComputerMaintenanceStatus, { props: { data: { computer: { ...computer,
      preventiveStatus: 'ok', lastPreventiveAt: tenDaysAgo, activeAlerts: 0 } } } });
    expect(screen.getByText('Preventiva em dia')).toBeInTheDocument();
    expect(screen.getByText(/Próxima em .* · faltam 82 dias/)).toBeInTheDocument();
  });

  it('shows the scheduled day with how many days are left', () => {
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const day = `${inFiveDays.getFullYear()}-${String(inFiveDays.getMonth() + 1).padStart(2, '0')}-${String(inFiveDays.getDate()).padStart(2, '0')}`;
    render(ComputerMaintenanceStatus, { props: { data: { computer, scheduledFor: day } } });
    expect(screen.getByText(/Agendada .* · faltam 5 dias/)).toBeInTheDocument();
  });

  // triste
  it('does not describe missing history as a completed preventive', () => {
    render(ComputerMaintenanceStatus, { props: { data: { computer: { ...computer,
      preventiveStatus: 'never', lastPreventiveAt: null, activeAlerts: 0 } } } });
    expect(screen.getByText('Preventiva sem registro')).toBeInTheDocument();
    expect(screen.queryByText('Preventiva em dia')).not.toBeInTheDocument();
    expect(screen.queryByText(/alertas críticos/)).not.toBeInTheDocument();
  });

  it('does not show outstanding work for a retired device', () => {
    render(ComputerMaintenanceStatus, { props: { data: { computer: { ...computer, isArchived: true } } } });
    expect(screen.getByText('Fora de uso')).toBeInTheDocument();
    expect(screen.queryByText('Preventiva vencida')).not.toBeInTheDocument();
    expect(screen.queryByText('2 alertas críticos ativos')).not.toBeInTheDocument();
  });
});
