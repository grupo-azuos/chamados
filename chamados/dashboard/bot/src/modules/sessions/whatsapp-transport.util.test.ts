import { describe, expect, it } from 'vitest';

import {
  DISCONNECTED_STATUS,
  RecipientNotFoundError,
  SessionNotConnectedError,
} from './whatsapp-transport.util.js';

describe('DISCONNECTED_STATUS', () => {
  // feliz
  it('carries neither a QR code nor a phone', () => {
    expect(DISCONNECTED_STATUS).toEqual({ state: 'disconnected', qr: null, phone: null });
  });
});

describe('transport errors', () => {
  // feliz
  /* O servidor HTTP do bot escolhe o código de resposta pelo TIPO do erro: os dois precisam ser
     distinguíveis um do outro e de um erro qualquer. */
  it('can be told apart by type', () => {
    const notConnected = new SessionNotConnectedError();
    const notFound = new RecipientNotFoundError();

    expect(notConnected).toBeInstanceOf(Error);
    expect(notConnected).not.toBeInstanceOf(RecipientNotFoundError);
    expect(notFound).not.toBeInstanceOf(SessionNotConnectedError);
    expect(notConnected.name).toBe('SessionNotConnectedError');
    expect(notFound.name).toBe('RecipientNotFoundError');
  });

  // triste
  /* A mensagem vai para o log e para a resposta: não pode carregar número nem id de ninguém. */
  it('never carries a phone or a session id in the message', () => {
    expect(new SessionNotConnectedError().message).toBe('Session is not connected');
    expect(new RecipientNotFoundError().message).toBe('Recipient is not on WhatsApp');
  });
});
