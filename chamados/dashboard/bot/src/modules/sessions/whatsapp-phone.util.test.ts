import { describe, expect, it } from 'vitest';

import { normalizePhone, phoneFromJid } from './whatsapp-phone.util.js';

describe('normalizePhone', () => {
  // feliz
  it('keeps only the digits of a phone with country code', () => {
    expect(normalizePhone('+55 (62) 99999-0001')).toBe('5562999990001');
    expect(normalizePhone('556232220001')).toBe('556232220001');
  });

  // triste
  it('refuses what is too short or too long to be a phone', () => {
    expect(normalizePhone('99990001')).toBeNull();
    expect(normalizePhone('1'.repeat(16))).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
});

describe('phoneFromJid', () => {
  // feliz
  it('reads the number out of a WhatsApp identifier', () => {
    expect(phoneFromJid('5562999990001:12@s.whatsapp.net')).toBe('5562999990001');
    expect(phoneFromJid('5562999990001@s.whatsapp.net')).toBe('5562999990001');
  });

  // triste
  it('answers null when there is no identifier, or it is not a phone', () => {
    expect(phoneFromJid(undefined)).toBeNull();
    expect(phoneFromJid(null)).toBeNull();
    expect(phoneFromJid('status@broadcast')).toBeNull();
  });
});
