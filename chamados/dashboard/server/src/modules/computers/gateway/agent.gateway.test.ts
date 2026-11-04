import { describe, expect, it, vi } from 'vitest';

import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { AgentPresenceService } from '../presence/agent-presence.service';
import { LiveWatchService, WATCHED_CADENCE_SECONDS } from '../presence/live-watch.service';
import { type ComputersService } from '../service/computers.service';
import { AgentGateway } from './agent.gateway';

const computer = { id: 7, name: 'RECEPCAO-01' } as ComputerRow;

const snapshot = {
  timestamp: '2026-09-28T12:00:00.000Z',
  host: {
    hostname: 'RECEPCAO-01',
    os: 'windows',
    platform: 'Windows 11',
    platformVersion: '10.0.22631',
    kernelVersion: '10.0.22631',
    arch: 'amd64',
    cpuModel: 'Intel Core i5',
    logicalCpus: 12,
    physicalCpus: 6,
    totalMemoryBytes: 16_000_000_000,
    macAddress: '00:11:22:33:44:55',
    localIp: '192.168.0.31',
    totalDiskBytes: 500_000_000_000,
    freeDiskBytes: 250_000_000_000,
    uptimeSeconds: 3600,
    bootTime: '2026-09-28T11:00:00.000Z',
  },
  cpu: { percentTotal: 30, percentPerCore: [25, 35] },
  memory: {
    totalBytes: 16_000_000_000,
    usedBytes: 8_000_000_000,
    freeBytes: 8_000_000_000,
    usedPercent: 50,
    swapTotalBytes: 0,
    swapUsedBytes: 0,
    swapUsedPercent: 0,
  },
  disks: [],
  diskIo: { readBytesPerSec: 0, writeBytesPerSec: 0 },
  network: [],
  processes: [],
};

/**
 * Uma conexão de mentira, no formato que o `ws` entrega.
 *
 * Guarda os ouvintes para o teste poder mandar mensagem como o agente manda: uma atrás da
 * outra, sem esperar resposta — que é exatamente o que provocava o defeito.
 */
function fakeSocket() {
  const listeners = new Map<string, (payload: never) => void>();
  const sent: string[] = [];
  const closed: { code?: number; reason?: string }[] = [];

  return {
    socket: {
      on: (event: string, listener: (payload: never) => void) => listeners.set(event, listener),
      send: (data: string) => sent.push(data),
      close: (code?: number, reason?: string) => closed.push({ code, reason }),
      ping: () => {},
      terminate: () => closed.push({ reason: 'terminate' }),
    },
    sent,
    closed,
    emit: (raw: string) => listeners.get('message')?.(raw as never),
  };
}

function makeGateway(authenticateDelayMs = 0) {
  const service = {
    authenticateAgent: vi.fn().mockImplementation(async () => {
      /* O token é conferido no BANCO: a resposta não chega no mesmo tique. É essa espera que
         a fila do gateway precisa respeitar. */
      await new Promise((resolve) => setTimeout(resolve, authenticateDelayMs));

      return { ok: true, computer };
    }),
    ingest: vi.fn().mockResolvedValue(undefined),
  };

  const gateway = new AgentGateway(
    service as unknown as ComputersService,
    new AgentPresenceService(),
    new LiveWatchService(),
  );

  return { gateway, service };
}

const hello = JSON.stringify({ type: 'hello', token: 'token', agentVersion: '1.0.0' });
const reading = JSON.stringify({ type: 'snapshot', snapshot });

describe('AgentGateway', () => {
  // feliz
  it('confirms the connection before accepting readings', async () => {
    const { gateway } = makeGateway();
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(hello);
    await vi.waitFor(() => expect(client.sent).toHaveLength(1));

    expect(JSON.parse(client.sent[0] ?? '{}')).toMatchObject({ type: 'welcome' });
  });

  /**
   * O defeito que travava a ficha da máquina no painel.
   *
   * O agente manda a apresentação e a primeira leitura em sequência, sem esperar. Conferir o
   * token vai ao banco, e enquanto isso a leitura chegava: a sessão ainda não existia e a
   * conexão caía com "snapshot before hello" — a cada reconexão, para sempre.
   */
  it('keeps a reading that arrives while the token is still being checked', async () => {
    const { gateway, service } = makeGateway(20);
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(hello);
    client.emit(reading);

    await vi.waitFor(() => expect(service.ingest).toHaveBeenCalledTimes(1));
    expect(client.closed).toHaveLength(0);
  });

  it('handles the readings in the order they arrived', async () => {
    const { gateway, service } = makeGateway(10);
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(hello);
    client.emit(reading);
    client.emit(reading);

    await vi.waitFor(() => expect(service.ingest).toHaveBeenCalledTimes(2));
  });

  // triste
  it('refuses a reading from a connection that never introduced itself', async () => {
    const { gateway, service } = makeGateway();
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit(reading);

    await vi.waitFor(() => expect(client.closed).toHaveLength(1));
    expect(service.ingest).not.toHaveBeenCalled();
  });

  it('refuses a message it cannot read', async () => {
    const { gateway } = makeGateway();
    const client = fakeSocket();

    gateway.handleConnection(client.socket);
    client.emit('isto não é json');

    await vi.waitFor(() => expect(client.closed).toHaveLength(1));
  });
});

describe('AgentGateway: session, cadence and heartbeat', () => {
  // feliz
  it('asks the agent for the fast cadence when the machine reconnects while watched', async () => {
    const service = {
      authenticateAgent: vi.fn().mockResolvedValue({ ok: true, computer }),
      ingest: vi.fn().mockResolvedValue(undefined),
    };
    const watch = new LiveWatchService();
    const presence = new AgentPresenceService();
    const gateway = new AgentGateway(service as unknown as ComputersService, presence, watch);
    const client = fakeSocket();
    watch.touch(computer.id, 5);

    gateway.handleConnection(client.socket as never);
    client.emit(hello);

    await vi.waitFor(() => expect(client.sent).toHaveLength(2));
    expect(JSON.parse(client.sent[0]!)).toEqual({ type: 'cadence', seconds: WATCHED_CADENCE_SECONDS });
    expect(JSON.parse(client.sent[1]!)).toMatchObject({ type: 'welcome' });
    expect(presence.isOnline(computer.id)).toBe(true);

    /* Quem está olhando parou de olhar: zero é "volte ao seu ritmo". */
    watch.onCadenceChange((computerId, seconds) =>
      (gateway as unknown as { sendCadence: (id: number, s: number) => void }).sendCadence(
        computerId,
        seconds,
      ),
    );
    (gateway as unknown as { sendCadence: (id: number, s: number) => void }).sendCadence(
      computer.id,
      0,
    );
    expect(JSON.parse(client.sent[2]!)).toEqual({ type: 'cadence', seconds: 0 });

    /* Máquina desligada não tem socket, e isso não é erro. */
    (gateway as unknown as { sendCadence: (id: number, s: number) => void }).sendCadence(99, 5);
    expect(client.sent).toHaveLength(3);

    gateway.handleDisconnect(client.socket as never);
    expect(presence.isOnline(computer.id)).toBe(false);
    /* Desconectar de novo (ou alguém que nunca se apresentou) não derruba nada. */
    gateway.handleDisconnect(client.socket as never);
    watch.onModuleDestroy();
  });

  it('keeps the newest socket of a machine when an older one drops', async () => {
    const { gateway } = makeGateway();
    const first = fakeSocket();
    const second = fakeSocket();

    gateway.handleConnection(first.socket as never);
    first.emit(hello);
    await vi.waitFor(() => expect(first.sent).toHaveLength(1));
    gateway.handleConnection(second.socket as never);
    second.emit(hello);
    await vi.waitFor(() => expect(second.sent).toHaveLength(1));

    gateway.handleDisconnect(first.socket as never);

    (gateway as unknown as { sendCadence: (id: number, s: number) => void }).sendCadence(
      computer.id,
      5,
    );
    expect(second.sent).toHaveLength(2);
    expect(first.sent).toHaveLength(1);
  });

  it('pings the agent and drops the connection that stops answering', async () => {
    vi.useFakeTimers();
    try {
      const { gateway } = makeGateway();
      const client = fakeSocket();
      const pings: number[] = [];
      client.socket.ping = () => pings.push(Date.now());
      const listeners = new Map<string, (payload: never) => void>();
      const original = client.socket.on;
      client.socket.on = (event, listener) => {
        original(event, listener);

        return listeners.set(event, listener);
      };

      gateway.handleConnection(client.socket as never);
      /* Apresentado a tempo: o que resta medir é só o batimento. */
      client.emit(hello);
      await vi.advanceTimersByTimeAsync(0);

      vi.advanceTimersByTime(15_000);
      expect(pings).toHaveLength(1);
      /* O agente respondeu: a contagem de silêncio volta a zero. */
      listeners.get('pong')?.(undefined as never);
      vi.advanceTimersByTime(15_000 * 2);
      expect(pings).toHaveLength(3);
      expect(client.closed).toEqual([]);

      /* Dois tiques sem resposta: a conexão cai, e o relógio para. */
      vi.advanceTimersByTime(15_000);
      expect(client.closed).toEqual([{ reason: 'terminate' }]);
      vi.advanceTimersByTime(15_000 * 3);
      expect(pings).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  // triste
  it('drops the connection that never introduces itself within ten seconds', () => {
    vi.useFakeTimers();
    try {
      const { gateway } = makeGateway();
      const client = fakeSocket();

      gateway.handleConnection(client.socket as never);
      vi.advanceTimersByTime(10_000);

      expect(client.closed).toEqual([{ code: 4009, reason: 'hello timeout' }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not drop a connection that introduced itself in time', async () => {
    vi.useFakeTimers();
    try {
      const { gateway } = makeGateway();
      const client = fakeSocket();

      gateway.handleConnection(client.socket as never);
      client.emit(hello);
      await vi.advanceTimersByTimeAsync(10_000);

      expect(client.closed).toEqual([]);
      expect(client.sent).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses a blocked machine and an unknown token with different codes', async () => {
    const blocked = {
      authenticateAgent: vi.fn().mockResolvedValue({ ok: false, reason: 'blocked' }),
      ingest: vi.fn(),
    };
    const gateway = new AgentGateway(
      blocked as unknown as ComputersService,
      new AgentPresenceService(),
      new LiveWatchService(),
    );
    const client = fakeSocket();
    gateway.handleConnection(client.socket as never);
    client.emit(hello);
    await vi.waitFor(() => expect(client.closed).toEqual([{ code: 4003, reason: 'blocked' }]));

    const unknown = {
      authenticateAgent: vi.fn().mockResolvedValue({ ok: false, reason: 'invalid token' }),
      ingest: vi.fn(),
    };
    const other = new AgentGateway(
      unknown as unknown as ComputersService,
      new AgentPresenceService(),
      new LiveWatchService(),
    );
    const socket = fakeSocket();
    other.handleConnection(socket.socket as never);
    socket.emit(hello);
    await vi.waitFor(() =>
      expect(socket.closed).toEqual([{ code: 4001, reason: 'invalid token' }]),
    );
  });

  it('logs a socket error without dropping anything', () => {
    const { gateway } = makeGateway();
    const client = fakeSocket();
    const listeners = new Map<string, (payload: never) => void>();
    client.socket.on = (event, listener) => listeners.set(event, listener);

    gateway.handleConnection(client.socket as never);
    listeners.get('error')?.(new Error('reset') as never);

    expect(client.closed).toEqual([]);
  });
});
