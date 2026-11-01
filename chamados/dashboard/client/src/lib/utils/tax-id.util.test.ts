import { describe, expect, it } from 'vitest';

import {
  formatTaxId,
  handleTaxIdInput,
  isValidTaxId,
  maskTaxId,
  normalizeTaxId,
  taxIdCheckDigits,
} from './tax-id.util';

describe('tax-id.util', () => {
  // feliz
  it('validates and formats a numeric and an alphanumeric CNPJ', () => {
    expect(normalizeTaxId('11.222.333/0001-81')).toBe('11222333000181');
    expect(taxIdCheckDigits('112223330001')).toBe('81');
    expect(isValidTaxId('11.222.333/0001-81')).toBe(true);
    expect(formatTaxId('11222333000181')).toBe('11.222.333/0001-81');
    expect(maskTaxId('112223')).toBe('11.222.3');
    const base = '12ABC34501DE';
    expect(isValidTaxId(`${base}${taxIdCheckDigits(base)}`)).toBe(true);
  });

  // feliz
  it('masks what is typed and says when it is complete', () => {
    const result = handleTaxIdInput({ value: '11222333000181' });

    expect(result.value).toBe('11.222.333/0001-81');
    expect(result.isComplete).toBe(true);
    expect(result.isValid).toBe(true);
  });

  // triste
  it('refuses a wrong check digit, a short value and nothing at all', () => {
    expect(isValidTaxId('11.222.333/0001-82')).toBe(false);
    expect(isValidTaxId('11222333')).toBe(false);
    expect(isValidTaxId(null)).toBe(false);
    expect(handleTaxIdInput({ value: '1122' }).isComplete).toBe(false);
  });
});
