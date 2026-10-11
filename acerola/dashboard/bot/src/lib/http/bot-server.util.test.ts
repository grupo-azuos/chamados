import { type AddressInfo } from 'node:net';
import { type Server } from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type WhatsAppTransport } from '../../modules/sessions/whatsapp-transport.type.js';
import {
  RecipientNotFoundError,
  SessionNotConnectedError,
} from '../../modules/sessions/whatsapp-transport.util.js';
import { createBotServer } from './bot-server.util.js';

const TOKEN = 't'.repeat(40);
const CONNECTED = { state: 'connected', qr: null, phone: '5562999990001' } as const;
const PAIRING = { state: 'pairing', qr: 'qr-content', phone: null } as const;

function fakeTransport(): WhatsAppTransport {
  return {
    link: vi.fn().mockResolvedValue(PAIRING),
    status: vi.fn().mockReturnValue(CONNECTED),
    unlink: vi.fn().mockResolvedValue(undefined),
    sendText: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn(),
    close: vi.fn(),
  };
}

describe('bot server', () => {
  let transport: WhatsAppTransport;
  let server: Server;
  let baseUrl: string;

  const call = (
    path: string,
    init: RequestInit = {},
    token: string | null = TOKEN,
  ): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  const post = (path: string, body: unknown): Promise<Response> =>
    call(path, { method: 'POST', body: JSON.stringify(body) });

  beforeEach(async () => {
    transport = fakeTransport();
    server = createBotServer(transport, TOKEN);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // feliz
  it('answers the health check without a token', async () => {
    const response = await call('/health', {}, null);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('tells the status of a session', async () => {
    const response = await call('/sessions/user-1');

    expect(await response.json()).toEqual(CONNECTED);
    expect(transport.status).toHaveBeenCalledWith('user-1');
  });

  it('starts the link and hands back the QR code', async () => {
    const response = await call('/sessions/user-1/link', { method: 'POST' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(PAIRING);
  });

  it('unlinks a session', async () => {
    const response = await call('/sessions/user-1', { method: 'DELETE' });

    expect(response.status).toBe(204);
    expect(transport.unlink).toHaveBeenCalledWith('user-1');
  });

  it('sends a text message through the session', async () => {
    const response = await post('/sessions/user-1/messages', { to: '5562999990002', text: 'Olá' });

    expect(response.status).toBe(202);
    expect(transport.sendText).toHaveBeenCalledWith('user-1', '5562999990002', 'Olá');
  });

  // triste
  /* Sem o token certo, ninguém consulta, vincula nem manda mensagem pelo número de ninguém. */
  it('refuses every session route without the right token', async () => {
    expect((await call('/sessions/user-1', {}, null)).status).toBe(401);
    expect((await call('/sessions/user-1', {}, 'x'.repeat(40))).status).toBe(401);
    expect((await call('/sessions/user-1/link', { method: 'POST' }, 'short')).status).toBe(401);
    expect(transport.status).not.toHaveBeenCalled();
    expect(transport.link).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown path or an invalid session id', async () => {
    expect((await call('/unknown')).status).toBe(404);
    expect((await call('/sessions/a.b')).status).toBe(404);
    expect((await call('/sessions/user-1/other')).status).toBe(404);
  });

  it('answers 405 for a method the route does not have', async () => {
    expect((await call('/sessions/user-1/messages')).status).toBe(405);
  });

  it('refuses a message without text, without recipient, or that is not JSON', async () => {
    expect(
      (await post('/sessions/user-1/messages', { to: '5562999990002', text: '  ' })).status,
    ).toBe(422);
    expect((await post('/sessions/user-1/messages', { text: 'Olá' })).status).toBe(422);
    expect(
      (await call('/sessions/user-1/messages', { method: 'POST', body: 'not json' })).status,
    ).toBe(422);
    expect(transport.sendText).not.toHaveBeenCalled();
  });

  it('answers 409 when the session is not connected', async () => {
    vi.mocked(transport.sendText).mockRejectedValue(new SessionNotConnectedError());

    const response = await post('/sessions/user-1/messages', { to: '5562999990002', text: 'Olá' });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'not_connected' });
  });

  it('answers 422 when the recipient is not on WhatsApp', async () => {
    vi.mocked(transport.sendText).mockRejectedValue(new RecipientNotFoundError());

    const response = await post('/sessions/user-1/messages', { to: '5562999990002', text: 'Olá' });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'recipient_not_found' });
  });

  /* O erro interno não sai na resposta: ele pode carregar número de telefone ou chave. */
  it('hides the detail of an unexpected failure', async () => {
    vi.mocked(transport.link).mockRejectedValue(new Error('socket exploded with 5562999990001'));

    const response = await call('/sessions/user-1/link', { method: 'POST' });

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('5562999990001');
  });

  it('refuses a body bigger than the limit', async () => {
    const response = await post('/sessions/user-1/messages', {
      to: '1',
      text: 'x'.repeat(200_000),
    });

    expect(response.status).toBe(413);
  });
});
