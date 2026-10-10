import { describe, expect, it } from 'vitest';

import { decryptSessionValue, encryptSessionValue } from './session-cipher.js';

const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

describe('session cipher', () => {
  // feliz
  it('gives back the same value it encrypted', () => {
    const encrypted = encryptSessionValue('{"me":"5562999990001"}', KEY);

    expect(encrypted).not.toContain('5562999990001');
    expect(decryptSessionValue(encrypted, KEY)).toBe('{"me":"5562999990001"}');
  });

  it('never produces the same text twice for the same value', () => {
    expect(encryptSessionValue('same', KEY)).not.toBe(encryptSessionValue('same', KEY));
  });

  it('handles an empty value (edge case)', () => {
    expect(decryptSessionValue(encryptSessionValue('', KEY), KEY)).toBe('');
  });

  // triste
  it('refuses a value encrypted with another key', () => {
    expect(() => decryptSessionValue(encryptSessionValue('secret', KEY), OTHER_KEY)).toThrow();
  });

  /* O GCM assina: mexer num byte do arquivo em disco tem que falhar, e não abrir lixo. */
  it('refuses a value that was tampered with', () => {
    const [iv, tag, content] = encryptSessionValue('secret', KEY).split('.');
    const tampered = [iv, tag, Buffer.from('other').toString('base64url') + content].join('.');

    expect(() => decryptSessionValue(tampered, KEY)).toThrow();
  });

  it('refuses a value that is not in the expected format', () => {
    expect(() => decryptSessionValue('not-encrypted', KEY)).toThrow(
      'Invalid encrypted session value',
    );
  });
});
