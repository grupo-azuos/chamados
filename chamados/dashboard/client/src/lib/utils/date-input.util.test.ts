import { describe, expect, it } from 'vitest';

import {
  displayFromIso,
  isIsoWithin,
  isoFromDisplay,
  maskDateInput,
  rangeHint,
} from './date-input.util';

describe('maskDateInput', () => {
  // feliz
  it('puts the slashes in as the person types only digits', () => {
    expect(maskDateInput('2')).toBe('2');
    expect(maskDateInput('2503')).toBe('25/03');
    expect(maskDateInput('25031990')).toBe('25/03/1990');
  });

  // feliz
  it('reads a pasted date with any separator', () => {
    expect(maskDateInput('25-03-1990')).toBe('25/03/1990');
    expect(maskDateInput('25/03/1990')).toBe('25/03/1990');
  });

  // triste
  it('drops letters and everything past eight digits', () => {
    expect(maskDateInput('ab25c03')).toBe('25/03');
    expect(maskDateInput('250319901234')).toBe('25/03/1990');
    expect(maskDateInput('')).toBe('');
  });
});

describe('isoFromDisplay', () => {
  // feliz
  it('turns a complete typed date into ISO', () => {
    expect(isoFromDisplay('25/03/1990')).toBe('1990-03-25');
    expect(isoFromDisplay('29/02/2024')).toBe('2024-02-29');
  });

  // triste
  it('returns nothing while the date is incomplete', () => {
    expect(isoFromDisplay('25/03')).toBeNull();
    expect(isoFromDisplay('25/03/199')).toBeNull();
    expect(isoFromDisplay('')).toBeNull();
  });

  // triste
  /* O `Date` do JavaScript aceita 31/02 e devolve 03/03 — a pessoa digitaria uma data e o sistema
     gravaria outra. */
  it('returns nothing for a day that does not exist', () => {
    expect(isoFromDisplay('31/02/2026')).toBeNull();
    expect(isoFromDisplay('29/02/2026')).toBeNull();
    expect(isoFromDisplay('00/01/2026')).toBeNull();
    expect(isoFromDisplay('10/13/2026')).toBeNull();
  });

  // triste
  it('returns nothing for a year that is not a real four-digit year', () => {
    expect(isoFromDisplay('25/03/0026')).toBeNull();
  });
});

describe('displayFromIso', () => {
  // feliz
  it('shows an ISO date as day/month/year', () => {
    expect(displayFromIso('1990-03-25')).toBe('25/03/1990');
    expect(displayFromIso('2026-10-20T23:45:00.000Z')).toBe('20/10/2026');
  });

  // triste
  it('shows nothing for an empty value or text that is not a date', () => {
    expect(displayFromIso(null)).toBe('');
    expect(displayFromIso(undefined)).toBe('');
    expect(displayFromIso('a definir')).toBe('');
    expect(displayFromIso('2002-02-31')).toBe('');
  });
});

describe('isIsoWithin', () => {
  // feliz
  it('accepts any date when there is no limit', () => {
    expect(isIsoWithin('1990-03-25')).toBe(true);
  });

  // feliz
  it('accepts the limits themselves', () => {
    expect(isIsoWithin('2026-01-01', '2026-01-01', '2026-12-31')).toBe(true);
    expect(isIsoWithin('2026-12-31', '2026-01-01', '2026-12-31')).toBe(true);
  });

  // triste
  it('refuses a date before the minimum or after the maximum', () => {
    expect(isIsoWithin('2025-12-31', '2026-01-01', null)).toBe(false);
    expect(isIsoWithin('2027-01-01', null, '2026-12-31')).toBe(false);
  });
});

describe('rangeHint', () => {
  // feliz
  it('explains the limit in day/month/year', () => {
    expect(rangeHint('2026-01-01', '2026-12-31')).toBe(
      'Escolha uma data entre 01/01/2026 e 31/12/2026.',
    );
    expect(rangeHint('2026-01-01')).toBe('Escolha uma data a partir de 01/01/2026.');
    expect(rangeHint(null, '2026-12-31')).toBe('Escolha uma data até 31/12/2026.');
  });

  // triste
  it('says nothing when there is no limit', () => {
    expect(rangeHint()).toBe('');
  });
});
