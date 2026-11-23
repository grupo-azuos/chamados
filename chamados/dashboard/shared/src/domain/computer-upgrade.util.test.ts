import { describe, expect, it } from 'vitest';

import { BYTES_PER_GB } from './computer-health.util';
import { isOldCpu, matchesUpgradeFilter, upgradeReasonsOf } from './computer-upgrade.util';

const GB = BYTES_PER_GB;

/** Uma máquina em dia: 16 GB, metade do disco livre, processador da 12ª geração. */
const healthy = {
  totalMemoryBytes: 16 * GB,
  totalDiskBytes: 500 * GB,
  freeDiskBytes: 250 * GB,
  cpuModel: '12th Gen Intel(R) Core(TM) i5-12400',
};

describe('isOldCpu', () => {
  // feliz
  it.each([
    'Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz',
    'Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz',
    'Intel(R) Core(TM) i5 CPU 650 @ 3.20GHz',
    'Intel(R) Core(TM)2 Duo CPU E8400 @ 3.00GHz',
    'Intel(R) Pentium(R) CPU G4560 @ 3.50GHz',
    'Intel(R) Celeron(R) CPU J1900 @ 1.99GHz',
    'Intel(R) Pentium(R) Dual-Core CPU E5700',
    'AMD Ryzen 5 1600 Six-Core Processor',
    'AMD FX(tm)-8350 Eight-Core Processor',
    'AMD A8-7600 Radeon R7, 10 Compute Cores 4C+6G',
    'AMD Athlon(tm) II X2 250 Processor',
    'AMD Phenom(tm) II X4 965 Processor',
  ])('calls %s old (before the Windows 11 cut)', (model) => {
    expect(isOldCpu(model)).toBe(true);
  });

  // triste
  it.each([
    'Intel(R) Core(TM) i5-8400 CPU @ 2.80GHz',
    'Intel(R) Core(TM) i7-10700 CPU @ 2.90GHz',
    '12th Gen Intel(R) Core(TM) i5-12400',
    'Intel(R) Pentium(R) Gold G5400 CPU @ 3.70GHz',
    'Intel(R) Celeron(R) N4020 CPU @ 1.10GHz',
    'AMD Ryzen 5 2600 Six-Core Processor',
    'AMD Ryzen 7 5700G with Radeon Graphics',
    'AMD Athlon Silver 3050U with Radeon Graphics',
    'Apple M1',
    '',
  ])('does not accuse %s', (model) => {
    expect(isOldCpu(model)).toBe(false);
  });

  // triste
  it('does not accuse a machine whose processor was never read', () => {
    expect(isOldCpu(null)).toBe(false);
  });
});

describe('upgradeReasonsOf', () => {
  // feliz
  it('lists every reason, in priority order, with the number behind it', () => {
    const reasons = upgradeReasonsOf({
      totalMemoryBytes: 4 * GB,
      totalDiskBytes: 100 * GB,
      freeDiskBytes: 9 * GB,
      cpuModel: 'Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz',
    });

    expect(reasons).toEqual([
      { need: 'memory', label: 'Pouca memória', detail: '4 GB de memória (menos de 8 GB)' },
      { need: 'disk', label: 'Pouco espaço em disco', detail: '9% livre no disco (menos de 15%)' },
      {
        need: 'cpu',
        label: 'Processador antigo',
        detail: 'Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz (sem suporte ao Windows 11)',
      },
    ]);
  });

  // feliz
  it('says nothing for a machine that is up to date', () => {
    expect(upgradeReasonsOf(healthy)).toEqual([]);
  });

  // triste
  it('recommends nothing before the agent measured the machine', () => {
    expect(upgradeReasonsOf({ totalMemoryBytes: null, totalDiskBytes: null, freeDiskBytes: null, cpuModel: null })).toEqual(
      [],
    );
  });

  // triste
  it('keeps exactly 8 GB and exactly 15% free out — the rule is "less than"', () => {
    expect(
      upgradeReasonsOf({ ...healthy, totalMemoryBytes: 8 * GB, totalDiskBytes: 100 * GB, freeDiskBytes: 15 * GB }),
    ).toEqual([]);
  });
});

describe('matchesUpgradeFilter', () => {
  const oldCpu = { ...healthy, cpuModel: 'AMD Ryzen 5 1600 Six-Core Processor' };

  // feliz
  it('matches "any" reason and the specific reason the machine has', () => {
    expect(matchesUpgradeFilter(oldCpu, 'any')).toBe(true);
    expect(matchesUpgradeFilter(oldCpu, 'cpu')).toBe(true);
  });

  // triste
  it('does not match another reason, nor a machine without any', () => {
    expect(matchesUpgradeFilter(oldCpu, 'memory')).toBe(false);
    expect(matchesUpgradeFilter(healthy, 'any')).toBe(false);
  });
});
