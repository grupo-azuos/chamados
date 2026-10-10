import { describe, expect, it } from 'vitest';

import { canLinkWhatsApp } from './whatsapp-access.util';

describe('canLinkWhatsApp', () => {
  // feliz
  it('lets a super admin link', () => {
    expect(canLinkWhatsApp({ role: 'superadmin' })).toBe(true);
  });

  it('lets a general admin link', () => {
    expect(canLinkWhatsApp({ role: 'admin' })).toBe(true);
  });

  /* Papel geral de usuário comum, mas admin de UMA área: é quem atende aquela área. */
  it('lets the admin of a single area link, whatever the general role is', () => {
    expect(
      canLinkWhatsApp({ role: 'user', roles: { infra: 'admin', sistema: 'user', manutencao: 'user' } }),
    ).toBe(true);
    expect(canLinkWhatsApp({ role: 'user', roles: { manutencao: 'superadmin' } })).toBe(true);
  });

  // triste
  it('refuses a regular user and a manager', () => {
    expect(canLinkWhatsApp({ role: 'user' })).toBe(false);
    expect(canLinkWhatsApp({ role: 'manager' })).toBe(false);
    expect(
      canLinkWhatsApp({ role: 'manager', roles: { infra: 'manager', sistema: 'user', manutencao: 'user' } }),
    ).toBe(false);
  });

  it('refuses when there is no one, or no role at all (edge case)', () => {
    expect(canLinkWhatsApp(null)).toBe(false);
    expect(canLinkWhatsApp(undefined)).toBe(false);
    expect(canLinkWhatsApp({})).toBe(false);
    expect(canLinkWhatsApp({ role: null, roles: null })).toBe(false);
  });
});
