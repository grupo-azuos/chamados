import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ComputerCard, {
  displayNameOf,
  freeDiskPercentOf,
  lastSeenLabelOf,
  situationOf,
} from './azuos-computer-card.svelte';

const GB = 1024 ** 3;

function computer(over: Partial<ComputerListItem> = {}): ComputerListItem {
  return {
    id: 7,
    ticketsThisMonth: 2,
    preventiveStatus: 'ok',
    lastPreventiveAt: '2026-10-01T12:00:00.000Z',
    activeAlerts: 0,
    activeAlertMetrics: [],
    name: 'FISCAL-D01',
    displayName: 'Fiscal — mesa 1',
    responsibleId: 'person-ana-prado',
    responsibleName: 'Ana Prado',
    responsibleAvatarUrl: null,
    departmentId: 5,
    departmentName: 'Fiscal',
    notes: null,
    kind: 'desktop',
    hardware: {
      hostname: 'FISCAL-D01',
      os: 'Windows 11',
      platform: 'windows',
      platformVersion: '10',
      kernelVersion: '10',
      arch: 'amd64',
      cpuModel: 'Intel Core i5',
      logicalCpus: 8,
      physicalCpus: 4,
      totalMemoryBytes: 16 * GB,
      macAddress: null,
      localIp: null,
      totalDiskBytes: 400 * GB,
      freeDiskBytes: 100 * GB,
      uptimeSeconds: 3600,
      bootTime: null,
    },
    healthScore: 82,
    healthStatus: 'attention',
    warnings: [],
    isOnline: true,
    lastSeenAt: '2026-11-22T11:58:00.000Z',
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

describe('the card helpers', () => {
  // feliz
  it('reads the name, the free disk and the last signal of a machine', () => {
    expect(displayNameOf(computer())).toBe('Fiscal — mesa 1');
    expect(freeDiskPercentOf(computer())).toBe(25);
    expect(lastSeenLabelOf(computer(), Date.parse('2026-11-22T12:00:00.000Z'))).toBe(
      'Visto há 2 minutos',
    );
  });

  // triste
  it('says what is missing instead of inventing a number', () => {
    expect(
      displayNameOf(
        computer({ displayName: ' ', hardware: { ...computer().hardware, hostname: null } }),
      ),
    ).toBe('FISCAL-D01');
    expect(
      freeDiskPercentOf(computer({ hardware: { ...computer().hardware, totalDiskBytes: null } })),
    ).toBeNull();
    expect(lastSeenLabelOf(computer({ lastSeenAt: null }))).toBe('Agente nunca conectou');
  });

  // feliz
  it('puts the decisions of the IT team before the connection', () => {
    expect(situationOf(computer({ isArchived: true })).label).toBe('Arquivada');
    expect(situationOf(computer({ isBlocked: true })).label).toBe('Bloqueada');
    expect(situationOf(computer()).label).toBe('Online');
    expect(situationOf(computer({ isOnline: false })).label).toBe('Offline');
  });
});

/**
 * O `Avatar` do Bits-UI só mostra a foto depois de um `new Image()` carregar — o jsdom nunca
 * carrega. Mesmo dublê do teste do `AzuosPersonAvatar`.
 */
class InstantLoadImage {
  complete = false;
  naturalWidth = 0;

  addEventListener(type: string, listener: () => void) {
    if (type === 'load') listener();
  }
  removeEventListener() {}

  set src(_value: string) {
    this.complete = true;
    this.naturalWidth = 1;
  }
}

describe('AzuosComputerCard — upgrade', () => {
  // feliz
  it('marks a machine that needs an upgrade with the calm badge', () => {
    render(ComputerCard, {
      props: {
        data: {
          computer: computer({
            hardware: { ...computer().hardware, totalMemoryBytes: 4 * 1024 ** 3 },
          }),
        },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(
      screen.getByRole('img', { name: /^Precisa de upgrade: Pouca memória/ }),
    ).toBeInTheDocument();
  });

  // triste
  it('shows no upgrade badge on a machine up to date', () => {
    const { container } = render(ComputerCard, {
      props: {
        data: {
          computer: computer({
            hardware: {
              ...computer().hardware,
              totalMemoryBytes: 16 * 1024 ** 3,
              totalDiskBytes: 500 * 1024 ** 3,
              freeDiskBytes: 300 * 1024 ** 3,
              cpuModel: '12th Gen Intel(R) Core(TM) i5-12400',
            },
          }),
        },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(container.querySelector('[data-slot="computer-upgrade-badge"]')).toBeNull();
  });
});

describe('AzuosComputerCard — responsible photo', () => {
  afterEach(() => vi.unstubAllGlobals());

  // feliz
  it('shows the real photo of the responsible from the directory', async () => {
    vi.stubGlobal('Image', InstantLoadImage);
    const { container } = render(ComputerCard, {
      props: {
        data: { computer: computer({ responsibleAvatarUrl: '/avatars/ana.png' }) },
        actions: { onOpen: vi.fn() },
      },
    });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', '/avatars/ana.png');
  });

  // triste
  it('falls back to the initials when the directory has no photo', () => {
    const { container } = render(ComputerCard, {
      props: {
        data: { computer: computer({ responsibleAvatarUrl: null }) },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(container.querySelector('[data-slot="avatar-image"]')).toBeNull();
    expect(screen.getByText('AP')).toBeInTheDocument();
  });
});

describe('AzuosComputerCard', () => {
  // feliz
  it('shows the machine like the Paralegal company card and opens the record', async () => {
    const onOpen = vi.fn();
    render(ComputerCard, { props: { data: { computer: computer() }, actions: { onOpen } } });

    expect(screen.getByRole('heading', { name: 'Fiscal — mesa 1' })).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Ana Prado')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Fiscal — mesa 1' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('pulses the corner badge while an alert is open or the preventive is overdue', () => {
    render(ComputerCard, {
      props: {
        data: { computer: computer({ activeAlerts: 1, preventiveStatus: 'due' }) },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(
      screen.getByRole('img', { name: '1 alerta crítico ativo · Preventiva vencida' }),
    ).toHaveTextContent('2');
  });

  // triste
  it('does not pulse, nor paint the hover, for a calm machine without a responsible', () => {
    const { container } = render(ComputerCard, {
      props: {
        data: {
          computer: computer({
            responsibleName: null,
            responsibleId: null,
            departmentId: null,
            departmentName: null,
          }),
        },
        actions: { onOpen: vi.fn() },
      },
    });

    expect(container.querySelector('[data-slot="computer-alert-badge"]')).toBeNull();
    expect(screen.getByText('(Sem responsável)')).toBeInTheDocument();
    expect(screen.getByText(/Sem departamento/)).toBeInTheDocument();
    const wash = container.querySelector<HTMLElement>('[data-slot="card-wash"]')!;
    expect(wash.style.getPropertyValue('--card-veil')).toBe('var(--hover-veil)');
  });
});
