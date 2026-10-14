import { EventEmitter } from 'node:events';

import { type Logger } from 'pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SessionStore } from '../../lib/storage/session-store.type.js';
import { type MessageResponder } from './whatsapp-transport.type.js';
import { RecipientNotFoundError, SessionNotConnectedError } from './whatsapp-transport.util.js';

/**
 * O Baileys de mentira: um socket que só guarda o que foi pedido e deixa o teste disparar os
 * eventos que o WhatsApp dispararia. O transporte de verdade nunca fala com a rede aqui.
 */
type FakeSocket = {
  ev: EventEmitter;
  user?: { id: string };
  sendMessage: ReturnType<typeof vi.fn>;
  onWhatsApp: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
};

const sockets: FakeSocket[] = [];
const LOGGED_OUT = 401;
const RESTART_REQUIRED = 515;

vi.mock('baileys', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();

  return {
    ...original,
    makeCacheableSignalKeyStore: (keys: unknown) => keys,
    makeWASocket: () => {
      const socket: FakeSocket = {
        ev: new EventEmitter(),
        sendMessage: vi.fn().mockResolvedValue({ key: { id: 'sent-by-bot' } }),
        onWhatsApp: vi
          .fn()
          .mockResolvedValue([{ exists: true, jid: '5562999990002@s.whatsapp.net' }]),
        logout: vi.fn().mockResolvedValue(undefined),
        end: vi.fn(),
      };
      sockets.push(socket);

      return socket;
    },
  };
});

const { createBaileysTransport } = await import('./baileys-transport.util.js');

function memoryStore(stored: string[] = []): SessionStore & { cleared: string[] } {
  const cleared: string[] = [];

  return {
    cleared,
    read: async () => null,
    write: async () => undefined,
    remove: async () => undefined,
    clear: async (sessionId) => void cleared.push(sessionId),
    list: async () => stored,
  };
}

const logger = { error: vi.fn() } as unknown as Logger;
const lastSocket = (): FakeSocket => sockets.at(-1) as FakeSocket;
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function incoming(text: string, key: Record<string, unknown> = {}) {
  return {
    type: 'notify',
    messages: [
      {
        key: { remoteJid: '5562999990002@s.whatsapp.net', fromMe: false, id: 'in-1', ...key },
        messageTimestamp: Math.floor(Date.now() / 1000),
        message: { conversation: text },
      },
    ],
  };
}

async function connected(store = memoryStore(), respond: MessageResponder = async () => null) {
  const transport = createBaileysTransport(store, logger, respond);
  await transport.link('user-1');
  const socket = lastSocket();
  socket.user = { id: '5562999990001:12@s.whatsapp.net' };
  socket.ev.emit('connection.update', { connection: 'open' });
  await flush();

  return { transport, socket, store };
}

function closeWith(socket: FakeSocket, statusCode?: number): void {
  socket.ev.emit('connection.update', {
    connection: 'close',
    lastDisconnect: { error: { output: { statusCode } } },
  });
}

beforeEach(() => {
  sockets.length = 0;
  vi.useRealTimers();
});

describe('createBaileysTransport — linking', () => {
  // feliz
  it('starts pairing and shows the QR code once WhatsApp hands it', async () => {
    const transport = createBaileysTransport(memoryStore(), logger, async () => null);

    expect(await transport.link('user-1')).toEqual({ state: 'pairing', qr: null, phone: null });
    lastSocket().ev.emit('connection.update', { qr: 'qr-content' });
    await flush();

    expect(transport.status('user-1')).toEqual({ state: 'pairing', qr: 'qr-content', phone: null });
  });

  it('becomes connected, with the linked number, once the phone reads the code', async () => {
    const { transport } = await connected();

    expect(transport.status('user-1')).toEqual({
      state: 'connected',
      qr: null,
      phone: '5562999990001',
    });
  });

  it('does not open a second socket when the link is asked again', async () => {
    const transport = createBaileysTransport(memoryStore(), logger, async () => null);

    await transport.link('user-1');
    await transport.link('user-1');

    expect(sockets).toHaveLength(1);
  });

  it('reopens every stored session when the bot starts', async () => {
    const transport = createBaileysTransport(
      memoryStore(['user-1', 'user-2']),
      logger,
      async () => null,
    );

    await transport.restore();

    expect(sockets).toHaveLength(2);
  });

  // triste
  it('answers "disconnected" for a session it never saw', () => {
    const transport = createBaileysTransport(memoryStore(), logger, async () => null);

    expect(transport.status('ghost')).toEqual({ state: 'disconnected', qr: null, phone: null });
  });

  /* QR code que venceu sem ninguém ler: a sessão some e nada é religado sozinho. */
  it('drops the session when the QR code expires unread', async () => {
    const store = memoryStore();
    const transport = createBaileysTransport(store, logger, async () => null);
    await transport.link('user-1');

    closeWith(lastSocket(), 408);
    await flush();

    expect(transport.status('user-1').state).toBe('disconnected');
    expect(store.cleared).toEqual(['user-1']);
    expect(sockets).toHaveLength(1);
  });

  /* Deslogado pelo próprio celular: a conexão guardada não vale mais nada. */
  it('forgets the stored connection when the phone logs the device out', async () => {
    const { transport, socket, store } = await connected();

    closeWith(socket, LOGGED_OUT);
    await flush();

    expect(transport.status('user-1').state).toBe('disconnected');
    expect(store.cleared).toEqual(['user-1']);
  });
});

describe('createBaileysTransport — reconnecting', () => {
  // feliz
  /* Logo depois de ler o QR code o WhatsApp pede um reinício: é parte do vínculo, não queda. */
  it('reopens right away when WhatsApp asks for a restart after pairing', async () => {
    vi.useFakeTimers();
    const transport = createBaileysTransport(memoryStore(), logger, async () => null);
    await transport.link('user-1');

    closeWith(lastSocket(), RESTART_REQUIRED);
    await vi.advanceTimersByTimeAsync(0);

    expect(sockets).toHaveLength(2);
  });

  it('waits before reopening a connected session that dropped', async () => {
    vi.useFakeTimers();
    const store = memoryStore();
    const transport = createBaileysTransport(store, logger, async () => null);
    await transport.link('user-1');
    lastSocket().ev.emit('connection.update', { connection: 'open' });
    await vi.advanceTimersByTimeAsync(0);

    closeWith(lastSocket(), 500);
    await vi.advanceTimersByTimeAsync(4999);
    expect(sockets).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(sockets).toHaveLength(2);
    expect(store.cleared).toEqual([]);
  });

  // triste
  it('does not reopen anything while the bot is shutting down', async () => {
    vi.useFakeTimers();
    const transport = createBaileysTransport(memoryStore(), logger, async () => null);
    await transport.link('user-1');
    const socket = lastSocket();
    socket.ev.emit('connection.update', { connection: 'open' });
    await vi.advanceTimersByTimeAsync(0);

    await transport.close();
    closeWith(socket, 500);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(socket.end).toHaveBeenCalledOnce();
    expect(sockets).toHaveLength(1);
  });
});

describe('createBaileysTransport — sending', () => {
  // feliz
  /* O endereço de verdade vem do WhatsApp: no Brasil o mesmo celular pode estar cadastrado com
     ou sem o nono dígito. */
  it('sends the text to the address WhatsApp says the number has', async () => {
    const { transport, socket } = await connected();

    await transport.sendText('user-1', '+55 (62) 99999-0002', 'Olá');

    expect(socket.onWhatsApp).toHaveBeenCalledWith('5562999990002');
    expect(socket.sendMessage).toHaveBeenCalledWith('5562999990002@s.whatsapp.net', {
      text: 'Olá',
    });
  });

  // triste
  it('refuses to send through a session that is not connected', async () => {
    const transport = createBaileysTransport(memoryStore(), logger, async () => null);
    await transport.link('user-1');

    await expect(transport.sendText('user-1', '5562999990002', 'Olá')).rejects.toThrow(
      SessionNotConnectedError,
    );
    await expect(transport.sendText('ghost', '5562999990002', 'Olá')).rejects.toThrow(
      SessionNotConnectedError,
    );
  });

  it('refuses a recipient that is not a phone, or is not on WhatsApp', async () => {
    const { transport, socket } = await connected();

    await expect(transport.sendText('user-1', 'ramal 12', 'Olá')).rejects.toThrow(
      RecipientNotFoundError,
    );

    socket.onWhatsApp.mockResolvedValue([{ exists: false, jid: '' }]);
    await expect(transport.sendText('user-1', '5562999990002', 'Olá')).rejects.toThrow(
      RecipientNotFoundError,
    );
    expect(socket.sendMessage).not.toHaveBeenCalled();
  });
});

describe('createBaileysTransport — answering', () => {
  // feliz
  it('hands a private text to the responder and sends the answer to the same chat', async () => {
    const respond = vi.fn<MessageResponder>().mockResolvedValue('resposta');
    const { socket } = await connected(memoryStore(), respond);

    socket.ev.emit('messages.upsert', incoming('/chamado'));
    await flush();

    expect(respond).toHaveBeenCalledWith({
      sessionId: 'user-1',
      chatId: '5562999990002@s.whatsapp.net',
      text: '/chamado',
      phone: '5562999990002',
      messageId: 'in-1',
    });
    expect(socket.sendMessage).toHaveBeenCalledWith('5562999990002@s.whatsapp.net', {
      text: 'resposta',
    });
  });

  // triste
  it('stays silent when the responder has nothing to say, or blows up', async () => {
    const respond = vi
      .fn<MessageResponder>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('x'));
    const { socket } = await connected(memoryStore(), respond);

    socket.ev.emit('messages.upsert', incoming('oi'));
    socket.ev.emit('messages.upsert', incoming('/chamado', { id: 'in-2' }));
    await flush();

    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  /* Histórico sendo sincronizado não é mensagem nova: não se responde. */
  it('ignores what is history being synced, not a new message', async () => {
    const respond = vi.fn<MessageResponder>().mockResolvedValue('resposta');
    const { socket } = await connected(memoryStore(), respond);

    socket.ev.emit('messages.upsert', { ...incoming('/chamado'), type: 'append' });
    await flush();

    expect(respond).not.toHaveBeenCalled();
  });

  /* Na conversa da pessoa com ela mesma a resposta do bot volta como "mensagem dela": sem esta
     trava, uma resposta igual a um comando faria o bot responder a si mesmo sem parar. */
  it('never answers its own answer', async () => {
    const respond = vi.fn<MessageResponder>().mockResolvedValue('resposta');
    const { socket } = await connected(memoryStore(), respond);
    socket.ev.emit('messages.upsert', incoming('/chamado'));
    await flush();

    socket.ev.emit('messages.upsert', incoming('resposta', { id: 'sent-by-bot', fromMe: true }));
    await flush();

    expect(respond).toHaveBeenCalledTimes(1);
  });
});

describe('createBaileysTransport — unlinking', () => {
  // feliz
  it('logs out on WhatsApp and erases the stored connection', async () => {
    const { transport, socket, store } = await connected();

    await transport.unlink('user-1');

    expect(socket.logout).toHaveBeenCalledOnce();
    expect(store.cleared).toEqual(['user-1']);
    expect(transport.status('user-1').state).toBe('disconnected');
  });

  // triste
  /* Falhar ao avisar o WhatsApp não pode impedir de apagar a conexão guardada. */
  it('still erases the stored connection when WhatsApp cannot be told', async () => {
    const { transport, socket, store } = await connected();
    socket.logout.mockRejectedValue(new Error('offline'));

    await transport.unlink('user-1');

    expect(store.cleared).toEqual(['user-1']);
  });
});
