import { describe, expect, it } from 'vitest';

import {
  daysUntilDay,
  daysUntilPreventive,
  isFrequentlyServiced,
  lastPreventiveAtOf,
  maintenanceTypeLabel,
  monthsSince,
  nextPreventiveAt,
  preventiveCountdownLabel,
  preventiveDueBefore,
  preventiveStatusOf,
  resetsPreventiveClock,
  scheduleCountdownLabel,
  scheduleTone,
} from './maintenance.util';

const NOW = Date.parse('2026-09-23T12:00:00.000Z');

describe('maintenanceTypeLabel', () => {
  // feliz
  it('reads the type in the words the screen uses', () => {
    expect(maintenanceTypeLabel('part_replacement')).toBe('Troca de peça');
  });
});

describe('resetsPreventiveClock', () => {
  // feliz
  /* Quem abriu a máquina para consertar fez a mesma limpeza da preventiva. */
  it('counts a repair as the preventive work being done', () => {
    expect(resetsPreventiveClock('corrective')).toBe(true);
    expect(resetsPreventiveClock('preventive')).toBe(true);
  });

  // triste
  /* Trocar uma peça pode acontecer sem ninguém abrir a máquina para limpar: contar isso
     anunciaria em dia uma máquina que não é aberta há um ano. */
  it('does not count a part swap or a reinstall', () => {
    expect(resetsPreventiveClock('part_replacement')).toBe(false);
    expect(resetsPreventiveClock('reinstall')).toBe(false);
    expect(resetsPreventiveClock('cleaning')).toBe(false);
  });
});

describe('monthsSince', () => {
  // feliz
  it('counts whole months, ignoring the half month', () => {
    expect(monthsSince('2026-06-23T12:00:00.000Z', NOW)).toBe(3);
    expect(monthsSince('2026-08-10T12:00:00.000Z', NOW)).toBe(1);
  });

  // triste
  /* Data no futuro não pode virar mês negativo: uma manutenção lançada com a data errada
     deixaria a máquina "mais em dia" do que uma feita hoje. */
  it('treats a future date as zero months, never as negative', () => {
    expect(monthsSince('2026-12-01T12:00:00.000Z', NOW)).toBe(0);
  });

  it('answers nothing when the text is not a date', () => {
    expect(monthsSince('ontem', NOW)).toBeNull();
  });
});

describe('preventiveStatusOf', () => {
  // feliz
  it('keeps a machine serviced last month up to date', () => {
    expect(preventiveStatusOf('2026-08-23T12:00:00.000Z', NOW)).toBe('ok');
  });

  it('calls it overdue once three months have passed', () => {
    expect(preventiveStatusOf('2026-06-20T12:00:00.000Z', NOW)).toBe('due');
  });

  // triste
  /* "Nunca feita" e "vencida" pedem a mesma ação, mas contam histórias diferentes: uma
     máquina cadastrada ontem não é um atraso do time. */
  it('separates a machine never serviced from one that is overdue', () => {
    expect(preventiveStatusOf(null, NOW)).toBe('never');
    expect(preventiveStatusOf(undefined, NOW)).toBe('never');
  });

  it('does not trust a date it cannot read', () => {
    expect(preventiveStatusOf('mês passado', NOW)).toBe('never');
  });
});

describe('daysUntilPreventive', () => {
  // feliz
  it('counts the days left until a recent preventive expires', () => {
    expect(daysUntilPreventive('2026-09-23T12:00:00.000Z', NOW)).toBe(92);
    expect(nextPreventiveAt('2026-09-23T12:00:00.000Z')).toBe('2026-12-23T19:40:48.000Z');
  });

  /* O prazo e o status têm de concordar: no dia em que o contador zera, o quadro já cobra. */
  it('agrees with the status about when the machine becomes overdue', () => {
    const lastDoneAt = '2026-06-20T12:00:00.000Z';

    expect(daysUntilPreventive(lastDoneAt, NOW)).toBeLessThanOrEqual(0);
    expect(preventiveStatusOf(lastDoneAt, NOW)).toBe('due');
  });

  // triste
  it('has no deadline for a machine never serviced or with an unreadable date', () => {
    expect(daysUntilPreventive(null, NOW)).toBeNull();
    expect(daysUntilPreventive('mês passado', NOW)).toBeNull();
    expect(nextPreventiveAt(undefined)).toBeNull();
  });
});

describe('lastPreventiveAtOf', () => {
  // feliz
  it('picks the latest preventive or corrective, whatever the order', () => {
    expect(lastPreventiveAtOf([
      { type: 'preventive', performedAt: '2026-05-01T12:00:00.000Z' },
      { type: 'corrective', performedAt: '2026-08-01T12:00:00.000Z' },
      { type: 'preventive', performedAt: '2026-07-01T12:00:00.000Z' },
    ])).toBe('2026-08-01T12:00:00.000Z');
  });

  // triste
  it('ignores services that do not open the machine', () => {
    expect(lastPreventiveAtOf([
      { type: 'part_replacement', performedAt: '2026-09-01T12:00:00.000Z' },
      { type: 'reinstall', performedAt: '2026-09-02T12:00:00.000Z' },
    ])).toBeNull();
    expect(lastPreventiveAtOf([])).toBeNull();
  });
});

describe('preventiveCountdownLabel', () => {
  // feliz
  it('speaks in days left', () => {
    expect(preventiveCountdownLabel(12)).toBe('faltam 12 dias');
    expect(preventiveCountdownLabel(1)).toBe('falta 1 dia');
    expect(preventiveCountdownLabel(0)).toBe('vence hoje');
  });

  // triste
  it('turns a negative count into delay, never "faltam -3 dias"', () => {
    expect(preventiveCountdownLabel(-1)).toBe('venceu há 1 dia');
    expect(preventiveCountdownLabel(-3)).toBe('venceu há 3 dias');
  });
});

describe('isFrequentlyServiced', () => {
  // feliz
  it('flags the machine at the third time it stopped someone work', () => {
    expect(isFrequentlyServiced(3)).toBe(true);
  });

  // triste
  it('does not flag a machine serviced twice', () => {
    expect(isFrequentlyServiced(2)).toBe(false);
    expect(isFrequentlyServiced(0)).toBe(false);
  });
});

describe('daysUntilDay', () => {
  const morning = new Date(2026, 9, 21, 8, 0);
  const night = new Date(2026, 9, 21, 23, 30);

  // feliz
  it('counts calendar days, whatever the hour', () => {
    expect(daysUntilDay('2026-10-22', morning)).toBe(1);
    expect(daysUntilDay('2026-10-22', night)).toBe(1);
    expect(daysUntilDay('2026-10-21', night)).toBe(0);
    expect(daysUntilDay('2026-11-05', morning)).toBe(15);
  });

  // triste
  it('goes negative when the date has passed, and refuses what is not a date', () => {
    expect(daysUntilDay('2026-10-18', morning)).toBe(-3);
    expect(daysUntilDay('amanhã', morning)).toBeNull();
  });
});

describe('scheduleCountdownLabel', () => {
  // feliz
  it('speaks in days left', () => {
    expect(scheduleCountdownLabel(5)).toBe('faltam 5 dias');
    expect(scheduleCountdownLabel(1)).toBe('falta 1 dia');
    expect(scheduleCountdownLabel(0)).toBe('é hoje');
  });

  // triste
  it('calls a missed date late, never "faltam -2 dias"', () => {
    expect(scheduleCountdownLabel(-1)).toBe('atrasada há 1 dia');
    expect(scheduleCountdownLabel(-2)).toBe('atrasada há 2 dias');
    expect(scheduleTone(-2)).toBe('danger');
    expect(scheduleTone(0)).toBe('warning');
    expect(scheduleTone(9)).toBe('info');
  });
});

describe('preventiveDueBefore', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');

  // feliz
  /* A data do banco e o selo da tela usam a mesma régua: feita no corte, já está vencida. */
  it('marks as due a preventive done at the cutoff, as the status badge does', () => {
    const cutoff = preventiveDueBefore(now).toISOString();

    expect(preventiveStatusOf(cutoff, now)).toBe('due');
  });

  // triste
  it('keeps a preventive done one day after the cutoff in date', () => {
    const dayAfter = new Date(preventiveDueBefore(now).getTime() + 24 * 60 * 60 * 1000);

    expect(preventiveStatusOf(dayAfter.toISOString(), now)).toBe('ok');
  });
});
