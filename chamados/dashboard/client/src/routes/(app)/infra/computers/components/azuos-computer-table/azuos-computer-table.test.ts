import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerTable, { ariaSortOf } from './azuos-computer-table.svelte';

function computer(over: Partial<ComputerListItem> = {}): ComputerListItem {
  return {
    id: 3,
    ticketsThisMonth: 0,
    preventiveStatus: 'ok',
    lastPreventiveAt: '2026-10-01T12:00:00.000Z',
    activeAlerts: 0,
    activeAlertMetrics: [],
    name: 'CAIXA-N01',
    displayName: null,
    responsibleName: null,
    department: null,
    kind: 'notebook',
    hardware: {
      os: null,
      platform: null,
      platformVersion: null,
      kernelVersion: null,
      arch: null,
      cpuModel: null,
      logicalCpus: null,
      physicalCpus: null,
      totalMemoryBytes: null,
      macAddress: null,
      localIp: null,
      totalDiskBytes: null,
      freeDiskBytes: null,
      uptimeSeconds: null,
      bootTime: null,
    },
    healthScore: 40,
    healthStatus: 'critical',
    warnings: [],
    isOnline: false,
    lastSeenAt: null,
    agentVersion: null,
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: null,
    disposalType: null,
    disposalReason: null,
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

describe('ariaSortOf', () => {
  // feliz
  it('tells the direction only on the column in charge', () => {
    expect(ariaSortOf({ field: 'health', direction: 'desc' }, 'health')).toBe('descending');
    expect(ariaSortOf({ field: 'health', direction: 'asc' }, 'health')).toBe('ascending');
  });

  // triste
  it('says none for every other column, and without a sort', () => {
    expect(ariaSortOf({ field: 'health', direction: 'asc' }, 'tickets')).toBe('none');
    expect(ariaSortOf(undefined, 'number')).toBe('none');
  });
});

describe('AzuosComputerTable', () => {
  // feliz
  it('flags the pending machine, sorts from the header and opens from the menu', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onSortChange = vi.fn();
    render(ComputerTable, {
      props: {
        data: {
          computers: [computer({ activeAlerts: 2 }), computer({ id: 4, name: 'CAIXA-N02' })],
          sort: { field: 'health', direction: 'asc' },
        },
        actions: { onOpen, onSortChange },
      },
    });

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveAttribute('data-pending', 'true');
    expect(within(rows[0]!).getByRole('img', { name: '2 alertas críticos ativos' })).toBeInTheDocument();
    expect(rows[1]).not.toHaveAttribute('data-pending');
    expect(screen.getByRole('columnheader', { name: /Saúde/ })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /Responsável/ }));
    expect(onSortChange).toHaveBeenCalledWith('responsible');

    await user.click(within(rows[1]!).getByRole('button', { name: 'Ações de CAIXA-N02' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ver ficha' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
  });

  // triste
  it('shows plain headers without a sort action, and says who is missing', () => {
    render(ComputerTable, {
      props: { data: { computers: [computer()] }, actions: { onOpen: vi.fn() } },
    });

    expect(screen.queryByRole('button', { name: /Responsável/ })).toBeNull();
    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    expect(screen.getByText('Sem departamento')).toBeInTheDocument();
    expect(screen.getByText('nunca')).toBeInTheDocument();
  });
});
