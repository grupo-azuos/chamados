import { afterEach, describe, expect, it, vi } from 'vitest';

import { createServerForwarder } from './server-forwarder.util.js';

const TOKEN = 't'.repeat(40);
const message = { sessionId: 'a'.repeat(64), chatId: 'chat', text: '/chamado', phone: null };

function mockFetch(response: Partial<Response> | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;

    return response as Response;
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('server forwarder', () => {
  // feliz
  it('posts the message to the server with the token and returns the answer', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ reply: 'oi', isOpen: true }) });

    const reply = await createServerForwarder('http://server.local/api/', TOKEN)(message);

    expect(reply).toEqual({ reply: 'oi', isOpen: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://server.local/api/integrations/whatsapp/inbound');
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    expect(JSON.parse(String(init.body))).toEqual(message);
  });

  // triste
  it('answers null when the server is unreachable', async () => {
    mockFetch(new Error('ECONNREFUSED'));

    expect(await createServerForwarder('http://server.local/api', TOKEN)(message)).toBeNull();
  });

  it('answers null when the server refuses or sends something unexpected', async () => {
    mockFetch({ ok: false, status: 401 });
    expect(await createServerForwarder('http://server.local/api', TOKEN)(message)).toBeNull();

    mockFetch({ ok: true, json: async () => ({ reply: 42 }) });
    expect(await createServerForwarder('http://server.local/api', TOKEN)(message)).toBeNull();
  });
});
