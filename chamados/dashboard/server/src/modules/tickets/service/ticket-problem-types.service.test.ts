import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type TicketProblemTypeRow } from '../../../lib/db/schema/ticket-problem-types.schema';
import { type TicketProblemTypesRepository } from '../repository/ticket-problem-types.repository';
import { TicketProblemTypesService } from './ticket-problem-types.service';

function rowOf(name: string): TicketProblemTypeRow {
  return {
    id: 1,
    area: 'infra',
    name,
    createdAt: new Date('2026-11-12T12:00:00.000Z'),
    createdBy: 'ti@example.com',
  };
}

function serviceWith(rows: TicketProblemTypeRow[] = []) {
  const stored = [...rows];
  const repository = {
    listByArea: vi.fn(async () => stored),
    findByName: vi.fn(
      async (_area: string, name: string) =>
        stored.find((row) => row.name.toLowerCase() === name.toLowerCase()) ?? null,
    ),
    insert: vi.fn(async (_area: string, name: string) => {
      stored.push(rowOf(name));
    }),
  };

  return {
    service: new TicketProblemTypesService(repository as unknown as TicketProblemTypesRepository),
    repository,
  };
}

describe('TicketProblemTypesService.options', () => {
  // feliz
  it('lists the fixed types, then the registered ones, then "Outro"', async () => {
    const { service } = serviceWith([rowOf('Leitor de código de barras')]);

    const labels = (await service.options('infra')).map((option) => option.label);

    expect(labels.at(-2)).toBe('Leitor de código de barras');
    expect(labels.at(-1)).toBe('Outro');
  });
});

describe('TicketProblemTypesService.resolve', () => {
  // feliz
  it('keeps a fixed key of the area', async () => {
    const { service } = serviceWith();

    await expect(service.resolve('infra', 'printer', 'ti@example.com')).resolves.toBe('printer');
  });

  it('registers a new name in the area', async () => {
    const { service, repository } = serviceWith();

    await expect(service.resolve('infra', '  Nobreak ', 'ti@example.com')).resolves.toBe('Nobreak');
    expect(repository.insert).toHaveBeenCalledWith('infra', 'Nobreak', 'ti@example.com');
  });

  it('reuses a registered name, whatever the case', async () => {
    const { service, repository } = serviceWith([rowOf('Nobreak')]);

    await expect(service.resolve('infra', 'nobreak', 'ti@example.com')).resolves.toBe('Nobreak');
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('turns a typed fixed label into its key instead of duplicating it', async () => {
    const { service, repository } = serviceWith();

    await expect(service.resolve('infra', 'impressora', 'ti@example.com')).resolves.toBe('printer');
    expect(repository.insert).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a fixed key of another area', async () => {
    const { service } = serviceWith();

    await expect(
      service.resolve('infra', 'air_conditioning', 'ti@example.com'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe('TicketProblemTypesService.register', () => {
  // feliz
  it('registers the typed name right away and hands back its option', async () => {
    const { service, repository } = serviceWith();

    await expect(service.register('infra', 'Monitor', 'ti@example.com')).resolves.toEqual({
      value: 'Monitor',
      label: 'Monitor',
    });
    expect(repository.insert).toHaveBeenCalledWith('infra', 'Monitor', 'ti@example.com');
  });

  // triste
  it('does not duplicate a fixed type typed by its label', async () => {
    const { service, repository } = serviceWith();

    await expect(service.register('infra', 'impressora', 'ti@example.com')).resolves.toEqual({
      value: 'printer',
      label: 'Impressora',
    });
    expect(repository.insert).not.toHaveBeenCalled();
  });
});
