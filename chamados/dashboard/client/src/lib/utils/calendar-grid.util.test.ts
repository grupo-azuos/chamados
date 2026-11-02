import { describe, expect, it } from 'vitest';

import {
  firstFocusableIso,
  isInMonth,
  monthGridIso,
  monthOfIso,
  nextDayForKey,
  shiftDayByMonthsIso,
  monthsOfYear,
  shiftMonthIso,
  shiftYear,
  weekdayOf,
  yearOfMonth,
} from './calendar-grid.util';

describe('monthOfIso', () => {
  // feliz
  it('takes the month a day belongs to', () => {
    expect(monthOfIso('2026-10-02')).toBe('2026-10');
  });

  // triste
  it('gives nothing for what is not a calendar day', () => {
    expect(monthOfIso('')).toBe('');
    expect(monthOfIso(null)).toBe('');
    expect(monthOfIso('2026-10')).toBe('');
    expect(monthOfIso('NÃO POSSUI')).toBe('');
  });
});

describe('shiftMonthIso', () => {
  // feliz
  it('walks forward and backward', () => {
    expect(shiftMonthIso('2026-10', 1)).toBe('2026-11');
    expect(shiftMonthIso('2026-10', -1)).toBe('2026-09');
  });

  /* Dezembro para janeiro e janeiro para dezembro: é onde a conta de mês costuma errar o ano. */
  it('crosses the year', () => {
    expect(shiftMonthIso('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthIso('2026-01', -1)).toBe('2025-12');
  });

  // triste
  it('gives nothing for an invalid month', () => {
    expect(shiftMonthIso('', 1)).toBe('');
    expect(shiftMonthIso('2026-10-02', 1)).toBe('');
  });
});

describe('monthGridIso', () => {
  // feliz
  it('opens on the Sunday before the 1st and closes six weeks later', () => {
    /* 01/10/2026 é uma quinta: a grade começa no domingo 27/09. */
    const grid = monthGridIso('2026-10');

    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-09-27');
    expect(grid[41]).toBe('2026-11-07');
  });

  it('keeps every day in order, with no hole and no repeat', () => {
    const grid = monthGridIso('2026-02');

    expect(new Set(grid).size).toBe(42);
    expect([...grid].sort()).toEqual(grid);
  });

  /**
   * Fevereiro de 2026 começa num domingo e tem 28 dias — cabe em quatro semanas. A grade
   * continua com 42 células, senão o calendário muda de altura ao trocar de mês.
   */
  it('still has six weeks for a short month', () => {
    const grid = monthGridIso('2026-02');

    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-02-01');
  });

  it('includes 29 February in a leap year', () => {
    expect(monthGridIso('2024-02')).toContain('2024-02-29');
  });

  // triste
  it('gives an empty grid for an invalid month', () => {
    expect(monthGridIso('')).toEqual([]);
    expect(monthGridIso('outubro')).toEqual([]);
  });
});

describe('isInMonth', () => {
  // feliz
  it('separates the full day from the faded one', () => {
    expect(isInMonth('2026-10-02', '2026-10')).toBe(true);
    expect(isInMonth('2026-09-27', '2026-10')).toBe(false);
  });

  // triste
  it('is false when either side is not a date', () => {
    expect(isInMonth('2026-10-02', '')).toBe(false);
    expect(isInMonth('', '2026-10')).toBe(false);
  });
});

describe('weekdayOf', () => {
  // feliz
  it('reads the weekday in UTC', () => {
    expect(weekdayOf('2026-10-04')).toBe(0); // domingo
    expect(weekdayOf('2026-10-10')).toBe(6); // sábado
  });

  // triste
  it('counts an invalid day as Sunday, never NaN', () => {
    expect(weekdayOf('')).toBe(0);
    expect(weekdayOf('2026-02-31')).toBe(0);
  });
});

describe('shiftDayByMonthsIso', () => {
  // feliz
  it('keeps the day when the target month has it', () => {
    expect(shiftDayByMonthsIso('2026-10-15', 1)).toBe('2026-11-15');
    expect(shiftDayByMonthsIso('2026-10-15', -1)).toBe('2026-09-15');
  });

  /* 31/03 menos um mês não é 31/02: sem o limite, rolaria para 03/03 e o PageUp pareceria
     não ter feito nada. */
  it('clamps to the last day of a shorter month', () => {
    expect(shiftDayByMonthsIso('2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftDayByMonthsIso('2024-03-31', -1)).toBe('2024-02-29');
  });

  // triste
  it('gives nothing for a day that does not exist', () => {
    expect(shiftDayByMonthsIso('2026-02-31', 1)).toBe('');
    expect(shiftDayByMonthsIso('', 1)).toBe('');
  });
});

describe('nextDayForKey', () => {
  // feliz
  it('walks a day with the side arrows and a week with the up and down ones', () => {
    expect(nextDayForKey('ArrowLeft', '2026-10-15')).toBe('2026-10-14');
    expect(nextDayForKey('ArrowRight', '2026-10-15')).toBe('2026-10-16');
    expect(nextDayForKey('ArrowUp', '2026-10-15')).toBe('2026-10-08');
    expect(nextDayForKey('ArrowDown', '2026-10-15')).toBe('2026-10-22');
  });

  it('goes to the ends of the week with Home and End', () => {
    /* 15/10/2026 é uma quinta: a semana dela vai de domingo 11 a sábado 17. */
    expect(nextDayForKey('Home', '2026-10-15')).toBe('2026-10-11');
    expect(nextDayForKey('End', '2026-10-15')).toBe('2026-10-17');
  });

  it('changes month with PageUp and PageDown', () => {
    expect(nextDayForKey('PageUp', '2026-10-15')).toBe('2026-09-15');
    expect(nextDayForKey('PageDown', '2026-10-15')).toBe('2026-11-15');
  });

  /* Andar para fora do mês é o que faz a seta para baixo no dia 28 chegar ao mês seguinte. */
  it('crosses the month border instead of stopping at it', () => {
    expect(nextDayForKey('ArrowDown', '2026-10-28')).toBe('2026-11-04');
    expect(nextDayForKey('ArrowLeft', '2026-10-01')).toBe('2026-09-30');
  });

  // triste
  it('gives nothing for a key that is not the grid’s', () => {
    expect(nextDayForKey('Tab', '2026-10-15')).toBe('');
    expect(nextDayForKey('Enter', '2026-10-15')).toBe('');
    expect(nextDayForKey('a', '2026-10-15')).toBe('');
  });

  it('gives nothing when the day it starts from is invalid', () => {
    expect(nextDayForKey('ArrowRight', '')).toBe('');
  });
});

describe('firstFocusableIso', () => {
  const days = monthGridIso('2026-10');

  // feliz
  it('lands on the chosen day when it is drawn', () => {
    expect(
      firstFocusableIso({
        days,
        selectedIso: '2026-10-15',
        todayIso: '2026-10-02',
        monthIso: '2026-10',
      }),
    ).toBe('2026-10-15');
  });

  it('falls back to today when nothing is chosen', () => {
    expect(
      firstFocusableIso({ days, selectedIso: '', todayIso: '2026-10-02', monthIso: '2026-10' }),
    ).toBe('2026-10-02');
  });

  /**
   * O caso que deixava a grade inalcançável pelo teclado: campo vazio e a pessoa folheia para
   * um mês distante, onde "hoje" não está desenhado. Precisa sobrar alguma célula com Tab.
   */
  it('falls back to the 1st when neither the choice nor today is drawn', () => {
    expect(
      firstFocusableIso({
        days: monthGridIso('2027-05'),
        selectedIso: '2026-10-15',
        todayIso: '2026-10-02',
        monthIso: '2027-05',
      }),
    ).toBe('2027-05-01');
  });

  // triste
  it('still answers a day for an empty grid', () => {
    expect(
      firstFocusableIso({ days: [], selectedIso: '', todayIso: '', monthIso: '2026-10' }),
    ).toBe('2026-10-01');
  });
});

describe('yearOfMonth', () => {
  // feliz
  it('takes the year out of a month', () => {
    expect(yearOfMonth('2026-10')).toBe('2026');
  });

  // triste
  it('gives nothing for what is not a month', () => {
    expect(yearOfMonth('')).toBe('');
    expect(yearOfMonth('2026-10-02')).toBe('');
  });
});

describe('shiftYear', () => {
  // feliz
  it('walks forward and backward', () => {
    expect(shiftYear('2026', 1)).toBe('2027');
    expect(shiftYear('2026', -1)).toBe('2025');
  });

  // triste
  it('gives nothing for what is not a year', () => {
    expect(shiftYear('26', 1)).toBe('');
    expect(shiftYear('2026-10', 1)).toBe('');
  });
});

describe('monthsOfYear', () => {
  // feliz
  it('gives the twelve months, in order and zero-padded', () => {
    const months = monthsOfYear('2026');

    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });

  /* Doze sempre: o filtro serve para olhar para trás tanto quanto para a frente. */
  // feliz
  it('gives all twelve even for a year already gone', () => {
    expect(monthsOfYear('2019')).toHaveLength(12);
  });

  // triste
  it('gives nothing for what is not a year', () => {
    expect(monthsOfYear('')).toEqual([]);
    expect(monthsOfYear('2026-10')).toEqual([]);
  });
});
