import { describe, expect, it } from 'vitest';

import { invitePhoneForForm } from './ticket-invite.util';

describe('invitePhoneForForm', () => {
  // feliz
  it('drops the Brazilian country code, leaving area code and number', () => {
    expect(invitePhoneForForm('5562999990001')).toBe('62999990001');
    expect(invitePhoneForForm('556232220001')).toBe('6232220001');
  });

  // triste
  /* De outro país, tirar dígitos daria um número que não existe. */
  it('leaves a number from another country as it came', () => {
    expect(invitePhoneForForm('14155550123')).toBe('14155550123');
  });

  it('answers empty text when WhatsApp did not tell the phone (edge case)', () => {
    expect(invitePhoneForForm(null)).toBe('');
    expect(invitePhoneForForm(undefined)).toBe('');
  });
});
