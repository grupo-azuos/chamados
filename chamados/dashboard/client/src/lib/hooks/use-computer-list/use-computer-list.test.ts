import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';
import Harness from './use-computer-list-harness.test.svelte';
import {
  scheduledDayByComputer,
  summarizeComputers,
  type ComputerListModel,
} from './use-computer-list.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/computers.api', () => ({
  computersApi: {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    exportReport: vi.fn(),
  },
}));

vi.mock('$lib/utils/download-file.util', () => ({ triggerBrowserDownload: vi.fn() }));

/* Os agendamentos vêm da Manutenção: sem nenhum, a lista não muda. */
vi.mock('$lib/api/maintenances.api', () => ({
  maintenancesApi: { schedules: vi.fn().mockResolvedValue([]) },
}));

const { computersApi } = await import('$lib/api/computers.api');
const { goto } = await import('$app/navigation');

const GB = 1024 ** 3;

function computer(over: Partial<ComputerListItem> = {}): ComputerListItem {
  return {
    ticketsThisMonth: 0,
    preventiveStatus: 'ok',
    lastPreventiveAt: '2026-10-01T12:00:00.000Z',
    activeAlerts: 0,
    activeAlertMetrics: [],
    id: 1,
    name: 'RECEPCAO-01',
    displayName: 'Recepção — balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    kind: 'desktop',
    hardware: {
      os: 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: '10.0.26100',
      kernelVersion: '10.0.26100',
      arch: 'amd64',
      cpuModel: 'Intel Core i5-12400',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 16 * GB,
      macAddress: '00:00:5E:00:53:01',
      localIp: '198.51.100.11',
      totalDiskBytes: 480 * GB,
      freeDiskBytes: 210 * GB,
      uptimeSeconds: 3600,
      bootTime: '2026-09-23T09:00:00.000Z',
    },
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: true,
    lastSeenAt: '2026-09-23T11:58:00.000Z',
    agentVersion: '1.0.0',
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

function page(items: ComputerListItem[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

/** Monta o model. O objeto devolvido tem getters, então continua vivo enquanto o teste roda. */
function mountModel(): ComputerListModel {
  let model!: ComputerListModel;
  render(Harness, { props: { onReady: (ready: ComputerListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<ComputerListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('summarizeComputers', () => {
  // feliz
  it('counts the park by what matters to whoever opens the screen', () => {
    const summary = summarizeComputers([
      computer(),
      computer({ id: 2, healthStatus: 'critical', isOnline: false }),
      computer({ id: 3, healthStatus: 'attention', isOnline: false, lastSeenAt: null }),
      computer({ id: 4, activeAlerts: 2, activeAlertMetrics: ['cpu', 'memory'] }),
      computer({ id: 5, activeAlerts: 1, activeAlertMetrics: ['memory'] }),
    ]);

    expect(summary).toEqual({
      total: 5,
      online: 3,
      offline: 2,
      withAlerts: 2,
      cpuHigh: 1,
      memoryHigh: 2,
      critical: 1,
      attention: 1,
      neverSeen: 1,
    });
  });

  // triste
  it('counts an empty park as zero, not as missing', () => {
    expect(summarizeComputers([])).toEqual({
      total: 0,
      online: 0,
      offline: 0,
      withAlerts: 0,
      cpuHigh: 0,
      memoryHigh: 0,
      critical: 0,
      attention: 0,
      neverSeen: 0,
    });
  });
});

describe('useComputerListModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.list).mockResolvedValue(page([computer()]));
    vi.mocked(goto).mockClear();
  });

  // feliz
  it('brings the inventory translated into the contract', async () => {
    const model = await mountLoadedModel();

    expect(model.data.computers).toHaveLength(1);
    expect(model.data.computers[0]?.name).toBe('RECEPCAO-01');
  });

  it('asks the API again when a filter changes', async () => {
    const model = await mountLoadedModel();

    model.actions.onHealthStatusChange('critical');

    await waitFor(() =>
      expect(computersApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ healthStatus: 'critical' }),
      ),
    );
  });

  it('sends and clears the online-only filter', async () => {
    const model = await mountLoadedModel();
    model.actions.onOnlineChange(true);
    await waitFor(() => expect(computersApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ onlyOnline: true }),
    ));
    model.actions.onClearFilters();
    await waitFor(() => expect(model.data.filter.onlyOnline).toBe(false));
  });

  // feliz
  it('sends the kind, offline and alert filters to the API', async () => {
    const model = await mountLoadedModel();

    model.actions.onKindChange('notebook');
    model.actions.onOfflineChange(true);
    model.actions.onAlertChange('cpu');

    await waitFor(() =>
      expect(computersApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'notebook', onlyOffline: true, alert: 'cpu' }),
      ),
    );
  });

  // triste
  /* Online e offline juntos não trariam máquina nenhuma: ligar um desliga o outro. */
  it('never keeps online and offline on at the same time', async () => {
    const model = await mountLoadedModel();

    model.actions.onOnlineChange(true);
    model.actions.onOfflineChange(true);

    await waitFor(() => expect(model.data.filter.onlyOffline).toBe(true));
    expect(model.data.filter.onlyOnline).toBe(false);
  });

  /* Arquivada saiu de uso: só entra na consulta quando alguém pede por ela. */
  it('leaves archived machines out until they are asked for', async () => {
    const model = await mountLoadedModel();

    expect(computersApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ includeArchived: undefined }),
    );

    model.actions.onArchivedChange(true);

    await waitFor(() =>
      expect(computersApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ includeArchived: true }),
      ),
    );
  });

  // feliz
  it('asks the API only for machines that need maintenance when the filter is on', async () => {
    const model = await mountLoadedModel();

    model.actions.onPreventiveChange('needed');

    await waitFor(() =>
      expect(computersApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ preventive: 'needed' }),
      ),
    );
  });

  // triste
  it('does not send the maintenance filter while it is off', async () => {
    await mountLoadedModel();

    expect(computersApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ preventive: undefined }),
    );
  });

  it('opens the machine record by its own address', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpen(computer({ id: 42 }));

    expect(goto).toHaveBeenCalledWith('/infra/computers/42');
  });

  // triste
  it('hands the screen the reason the inventory did not load', async () => {
    vi.mocked(computersApi.list).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  /* Vazio de verdade e filtro sem resultado levam a próximos passos diferentes, e por isso
     são dois estados, não um. */
  it('separates an empty inventory from a filter that hid everything', async () => {
    vi.mocked(computersApi.list).mockResolvedValue(page([]));

    const model = await mountLoadedModel();
    expect(model.state.isEmpty).toBe(true);
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onSearchChange('máquina do porão');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not call the inventory empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  /* Truncar calado é mentir sobre o tamanho do parque. */
  it('says the list was cut when more machines matched than came back', async () => {
    vi.mocked(computersApi.list).mockResolvedValue(page([computer()], 240));

    const model = await mountLoadedModel();

    expect(model.state.isTruncated).toBe(true);
  });

  describe('onExportReport', () => {
    // feliz
    it('downloads the file with the same filters as the inventory', async () => {
      vi.mocked(computersApi.exportReport).mockResolvedValue({
        blob: new Blob(['x']),
        fileName: 'inventario.docx',
      });
      const model = await mountLoadedModel();
      model.actions.onDepartmentChange('rh');
      await waitFor(() => expect(model.data.filter.department).toBe('rh'));

      model.actions.onExportReport('docx');
      await waitFor(() => expect(model.state.exportingFormat).toBeNull());

      expect(computersApi.exportReport).toHaveBeenCalledWith(
        expect.objectContaining({ department: 'rh' }),
        'docx',
      );
      expect(triggerBrowserDownload).toHaveBeenCalledWith(expect.any(Blob), 'inventario.docx');
    });

    // triste
    it('shows the reason instead of a silently missing download', async () => {
      vi.mocked(computersApi.exportReport).mockRejectedValue(
        new ApiError(403, 'Seu perfil não permite consultar os computadores.'),
      );
      const model = await mountLoadedModel();

      model.actions.onExportReport('pdf');

      await waitFor(() => {
        expect(model.state.exportError).toBe('Seu perfil não permite consultar os computadores.');
        expect(model.state.exportingFormat).toBeNull();
      });
    });
  });
});

describe('scheduledDayByComputer', () => {
  const schedule = {
    computerId: 7,
    computerName: 'PC-7',
    computerDisplayName: null,
    computerDepartment: null,
    scheduledFor: '2026-11-05',
    note: null,
    createdAt: '2026-10-21T12:00:00.000Z',
    createdBy: 'suporte@teste.local',
    updatedAt: null,
    updatedBy: null,
  };

  // feliz
  it('gives each machine its scheduled day', () => {
    expect(scheduledDayByComputer([schedule])).toEqual({ 7: '2026-11-05' });
  });

  // triste
  it('gives nothing while the schedules have not arrived', () => {
    expect(scheduledDayByComputer(undefined)).toEqual({});
  });
});
