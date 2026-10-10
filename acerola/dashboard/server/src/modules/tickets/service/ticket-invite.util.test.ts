import { describe, expect, it } from 'vitest';

import { signTicketInvite, verifyTicketInvite } from './ticket-invite.util';

const SECRET = 's'.repeat(40);
const NOW = 1_800_000_000;
const payload = { assigneeId: 'u-ana', phone: '5562999990002', expiresAt: NOW + 1800 };

describe('ticket invite', () => {
  // feliz
  it('reads back what the server signed', () => {
    expect(verifyTicketInvite(signTicketInvite(payload, SECRET), SECRET, NOW)).toEqual(payload);
  });

  it('carries an invite without a phone', () => {
    const token = signTicketInvite({ ...payload, phone: null }, SECRET);

    expect(verifyTicketInvite(token, SECRET, NOW)?.phone).toBeNull();
  });

  it('never shows the signing secret inside the link', () => {
    expect(signTicketInvite(payload, SECRET)).not.toContain(SECRET);
  });

  // triste
  it('refuses an invite after it expires', () => {
    const token = signTicketInvite(payload, SECRET);

    expect(verifyTicketInvite(token, SECRET, NOW + 1801)).toBeNull();
    expect(verifyTicketInvite(token, SECRET, NOW + 1800)).not.toBeNull();
  });

  /* O ataque que a assinatura existe para barrar: trocar o telefone ou o responsável do link. */
  it('refuses an invite whose content was changed', () => {
    const [, signature] = signTicketInvite(payload, SECRET).split('.');
    const forged = Buffer.from(
      JSON.stringify({ a: 'u-ana', p: '5562988887777', e: NOW + 1800 }),
    ).toString('base64url');

    expect(verifyTicketInvite(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('refuses an invite signed with another secret', () => {
    expect(verifyTicketInvite(signTicketInvite(payload, 'x'.repeat(40)), SECRET, NOW)).toBeNull();
  });

  it('refuses what is not an invite at all', () => {
    for (const token of ['', 'abc', 'a.b.c', '.', 'not-base64.zzz']) {
      expect(verifyTicketInvite(token, SECRET, NOW)).toBeNull();
    }
  });

  /* Assinatura certa sobre um conteúdo que não é convite: também não vale. */
  it('refuses a correctly signed content that is not an invite (edge case)', () => {
    const [content] = signTicketInvite(payload, SECRET).split('.');
    const other = Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64url');
    const reSigned = signTicketInvite(payload, SECRET).replace(content ?? '', other);

    expect(verifyTicketInvite(reSigned, SECRET, NOW)).toBeNull();
  });
});
