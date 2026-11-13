import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Client } from 'pg';

import { ensureDatabase, DATABASE_MISSING } from './ensure-database.util';

vi.mock('pg', () => {
  const ClientMock = vi.fn();
  return { Client: ClientMock };
});

describe('ensureDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // feliz
  it('returns false when the database already exists', async () => {
    const query = vi.fn().mockResolvedValue({});
    const connect = vi.fn().mockResolvedValue(undefined);
    const end = vi.fn().mockResolvedValue(undefined);

    vi.mocked(Client).mockImplementation(function () {
      return {
        connect,
        query,
        end,
      } as unknown as Client;
    });

    const result = await ensureDatabase('postgresql://user:pass@localhost:5432/chamados');
    expect(result).toBe(false);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  // feliz
  it('creates the database through /postgres on error 3D000', async () => {
    let callCount = 0;
    const probeConnect = vi.fn().mockRejectedValue({ code: DATABASE_MISSING });
    const probeEnd = vi.fn().mockResolvedValue(undefined);

    const adminConnect = vi.fn().mockResolvedValue(undefined);
    const adminQuery = vi.fn().mockResolvedValue({});
    const adminEnd = vi.fn().mockResolvedValue(undefined);

    vi.mocked(Client).mockImplementation(function () {
      callCount++;
      if (callCount === 1) {
        return {
          connect: probeConnect,
          query: vi.fn(),
          end: probeEnd,
        } as unknown as Client;
      }
      return {
        connect: adminConnect,
        query: adminQuery,
        end: adminEnd,
      } as unknown as Client;
    });

    const result = await ensureDatabase('postgresql://user:pass@localhost:5432/chamados');
    expect(result).toBe(true);
    expect(probeConnect).toHaveBeenCalledTimes(1);
    expect(adminConnect).toHaveBeenCalledTimes(1);
    expect(adminQuery).toHaveBeenCalledWith('CREATE DATABASE "chamados"');
    expect(adminEnd).toHaveBeenCalledTimes(1);
  });

  // triste
  it('rethrows when the connection error is not 3D000', async () => {
    const probeConnect = vi
      .fn()
      .mockRejectedValue({ code: '28P01', message: 'password authentication failed' });
    const probeEnd = vi.fn().mockResolvedValue(undefined);

    vi.mocked(Client).mockImplementation(function () {
      return {
        connect: probeConnect,
        query: vi.fn(),
        end: probeEnd,
      } as unknown as Client;
    });

    await expect(
      ensureDatabase('postgresql://user:pass@localhost:5432/chamados'),
    ).rejects.toMatchObject({ code: '28P01' });
  });

  // triste
  it('rejects an invalid database name to prevent injection', async () => {
    const probeConnect = vi.fn().mockRejectedValue({ code: DATABASE_MISSING });
    const probeEnd = vi.fn().mockResolvedValue(undefined);

    vi.mocked(Client).mockImplementation(function () {
      return {
        connect: probeConnect,
        query: vi.fn(),
        end: probeEnd,
      } as unknown as Client;
    });

    await expect(
      ensureDatabase('postgresql://user:pass@localhost:5432/chamados;drop%20database%20test'),
    ).rejects.toThrow('Invalid database name');
  });
});
