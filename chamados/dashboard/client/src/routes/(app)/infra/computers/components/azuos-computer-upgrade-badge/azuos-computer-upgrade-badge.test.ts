import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import UpgradeBadge, {
  computerUpgradeMessage,
  computerUpgradeReasonsOf,
  type ComputerUpgradeSource,
} from './azuos-computer-upgrade-badge.svelte';

const GB = 1024 ** 3;

function hardware(over: Partial<ComputerListItem['hardware']> = {}): ComputerListItem['hardware'] {
  return {
    os: null,
    platform: null,
    platformVersion: null,
    kernelVersion: null,
    arch: null,
    cpuModel: '12th Gen Intel(R) Core(TM) i5-12400',
    logicalCpus: null,
    physicalCpus: null,
    totalMemoryBytes: 16 * GB,
    macAddress: null,
    localIp: null,
    totalDiskBytes: 500 * GB,
    freeDiskBytes: 250 * GB,
    uptimeSeconds: null,
    bootTime: null,
    ...over,
  };
}

const machine = (over: Partial<ComputerUpgradeSource> = {}): ComputerUpgradeSource => ({
  hardware: hardware(),
  isArchived: false,
  disposedAt: null,
  ...over,
});

const slow = machine({
  hardware: hardware({
    totalMemoryBytes: 4 * GB,
    cpuModel: 'Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz',
  }),
});

describe('computerUpgradeReasonsOf', () => {
  // feliz
  it('lists the reasons of a machine in use, with the shared rules', () => {
    expect(computerUpgradeReasonsOf(slow).map((reason) => reason.need)).toEqual(['memory', 'cpu']);
    expect(computerUpgradeMessage(computerUpgradeReasonsOf(slow))).toBe(
      'Precisa de upgrade: Pouca memória, Processador antigo',
    );
  });

  // triste
  it('has nothing for a machine up to date, archived or disposed', () => {
    expect(computerUpgradeReasonsOf(machine())).toEqual([]);
    expect(computerUpgradeReasonsOf({ ...slow, isArchived: true })).toEqual([]);
    expect(computerUpgradeReasonsOf({ ...slow, disposedAt: '2026-10-01T00:00:00.000Z' })).toEqual(
      [],
    );
  });
});

describe('AzuosComputerUpgradeBadge', () => {
  // feliz
  it('shows a calm "Upgrade" badge that never pulses', () => {
    render(UpgradeBadge, { props: { data: { computer: slow } } });

    const badge = screen.getByRole('img', {
      name: 'Precisa de upgrade: Pouca memória, Processador antigo',
    });
    expect(badge).toHaveTextContent('Upgrade');
    expect(badge.querySelector('[class*="animate"]')).toBeNull();
  });

  // triste
  it('draws nothing when the machine needs no upgrade', () => {
    const { container } = render(UpgradeBadge, { props: { data: { computer: machine() } } });

    expect(container.querySelector('[data-slot="computer-upgrade-badge"]')).toBeNull();
  });
});
