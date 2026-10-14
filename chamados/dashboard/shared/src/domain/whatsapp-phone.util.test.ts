import { describe, expect, it } from 'vitest';

import { formatLinkedPhone } from './whatsapp-phone.util';

describe('formatLinkedPhone', () => {
  // feliz
  it('masks a Brazilian mobile number', () => {
    expect(formatLinkedPhone('5562999990001')).toBe('+55 (62) 99999-0001');
  });

  it('masks a Brazilian number without the ninth digit', () => {
    expect(formatLinkedPhone('556232220001')).toBe('+55 (62) 3222-0001');
  });

  // triste
  /* Máscara de país desconhecido seria chute: sai só o `+`. */
  it('only adds the plus sign to a number from another country', () => {
    expect(formatLinkedPhone('14155550123')).toBe('+14155550123');
    expect(formatLinkedPhone('5511')).toBe('+5511');
  });

  it('answers empty text when there is no number (edge case)', () => {
    expect(formatLinkedPhone(null)).toBe('');
    expect(formatLinkedPhone(undefined)).toBe('');
    expect(formatLinkedPhone('')).toBe('');
  });
});
