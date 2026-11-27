import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type HistoryRow } from '../../../lib/db/schema/history.schema';
import { kindPattern, type HistoryRepository } from '../repository/history.repository';
import { historyValueText, HistoryReadService } from './history-read.service';

/** Ana é usuária da Infraestrutura e de mais nada. */
const ana: RequestUser = {
  id: 'u-ana',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'user',
  roles: { infra: 'user' },
};

function row(overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id: 7,
    action: 'maintenances.update',
    actorId: 'u-caio',
    actorEmail: 'caio@empresa.com.br',
    targetType: 'maintenances',
    targetId: '12',
    targetLabel: null,
    ip: null,
    userAgent: null,
    changes: [{ field: 'performedByIds', from: null, to: ['u-caio', 'u-bia'] }],
    occurredAt: new Date('2026-11-20T13:00:00.000Z'),
    ...overrides,
  };
}

function serviceWith(rows: HistoryRow[], directory?: Partial<UserDirectoryProvider>) {
  const list = vi.fn().mockResolvedValue({ rows, total: rows.length });
  const service = new HistoryReadService(
    { list } as unknown as HistoryRepository,
    directory as UserDirectoryProvider | undefined,
  );

  return { service, list };
}

const QUERY = { module: 'infra' as const, page: 1, pageSize: 50 };

describe('HistoryReadService', () => {
  // feliz
  it('lists the module history with the name of today of who did it and the values in text', async () => {
    const { service, list } = serviceWith([row()], {
      listUsers: vi.fn().mockResolvedValue([{ id: 'u-caio', name: 'Caio Reis', email: 'caio@empresa.com.br' }]),
    });

    const page = await service.list(ana, QUERY);

    expect(list).toHaveBeenCalledWith(QUERY, null);
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      id: '7',
      kind: 'updated',
      actor: { id: 'u-caio', name: 'Caio Reis' },
      changes: [{ field: 'performedByIds', from: null, to: 'u-caio, u-bia' }],
      occurredAt: '2026-11-20T13:00:00.000Z',
    });
  });

  // feliz
  it('narrows to what the person did when she asks for "mine"', async () => {
    const { service, list } = serviceWith([]);

    await service.list(ana, { ...QUERY, actor: 'me' });

    expect(list).toHaveBeenCalledWith({ ...QUERY, actor: 'me' }, 'u-ana');
  });

  // triste
  it('refuses the history of a module the person does not have', async () => {
    const { service, list } = serviceWith([]);

    await expect(service.list(ana, { ...QUERY, module: 'manutencao' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(list).not.toHaveBeenCalled();
  });

  // triste
  it('keeps the e-mail when the directory is down, and calls the machine nobody', async () => {
    const { service } = serviceWith([row(), row({ id: 8, actorId: null, actorEmail: null })], {
      listUsers: vi.fn().mockRejectedValue(new Error('admin-console fora do ar')),
    });

    const page = await service.list(ana, QUERY);

    expect(page.items.map((item) => item.actor.name)).toEqual(['caio@empresa.com.br', null]);
  });
});

describe('historyValueText', () => {
  // feliz
  it('turns lists, numbers and objects into text', () => {
    expect(historyValueText(['a', 'b'])).toBe('a, b');
    expect(historyValueText(3)).toBe('3');
    expect(historyValueText({ id: 1 })).toBe('{"id":1}');
  });

  // triste
  it('says blank for nothing, an empty text and an empty list', () => {
    expect(historyValueText(null)).toBeNull();
    expect(historyValueText('')).toBeNull();
    expect(historyValueText([])).toBeNull();
  });
});

describe('kindPattern', () => {
  // feliz
  it('matches the verbs of each kind at the start of the handler', () => {
    expect(new RegExp(kindPattern('created').pattern).test('createByRequester')).toBe(true);
    expect(kindPattern('created').isNegated).toBe(false);
  });

  // triste
  it('makes "updated" everything that is none of the other three', () => {
    const { pattern, isNegated } = kindPattern('updated');

    expect(isNegated).toBe(true);
    expect(new RegExp(pattern).test('restoreSchedule')).toBe(true);
    expect(new RegExp(pattern).test('update')).toBe(false);
  });
});
