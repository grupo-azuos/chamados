import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { type TicketWatchersRepository } from '../repository/ticket-watchers.repository';
import { describeChange, TicketPeopleService } from './ticket-people.service';

const directoryUsers = [
  { id: 'bia', name: 'Bia Costa', email: 'bia@azuos.com.br', banned: false, image: 'https://x/bia.png' },
  { id: 'caio', name: 'Caio Reis', email: 'caio@azuos.com.br', banned: false },
  { id: 'dani', name: 'Dani Alves', email: 'dani@azuos.com.br', banned: false },
  { id: 'eva', name: 'Eva Banida', email: 'eva@azuos.com.br', banned: true },
];

const ticket = {
  id: 7,
  status: 'in_progress',
  requesterId: 'bia',
  requesterName: 'Bia Costa',
  assignee: 'Ana Lima',
  assigneeId: 'ana',
} as TicketRow;

const author = { id: 'ana', name: 'Ana Lima', email: 'ana@azuos.com.br' };

function setup(current: { userId: string; userName: string }[] = []) {
  const watchers = {
    listByTicket: vi.fn().mockResolvedValue(current),
    add: vi.fn(),
    remove: vi.fn(),
    ticketIdsOf: vi.fn().mockResolvedValue([]),
  };
  const histories = { record: vi.fn() };
  const service = new TicketPeopleService(
    { listUsers: vi.fn().mockResolvedValue(directoryUsers) } as unknown as UserDirectoryProvider,
    watchers as unknown as TicketWatchersRepository,
    histories as unknown as TicketHistoriesRepository,
  );

  return { service, watchers, histories };
}

describe('TicketPeopleService', () => {
  // feliz
  it('offers every active person of the admin-console, in alphabetical order, with the photo', async () => {
    const { service } = setup();

    expect(await service.options()).toEqual([
      { id: 'bia', name: 'Bia Costa', avatarUrl: 'https://x/bia.png' },
      { id: 'caio', name: 'Caio Reis', avatarUrl: null },
      { id: 'dani', name: 'Dani Alves', avatarUrl: null },
    ]);
  });

  // feliz
  it('links people on opening with the directory name, leaving the requester out', async () => {
    const { service, watchers } = setup();

    await service.attachOnOpening(ticket, ['bia', 'caio'], 'bia@azuos.com.br');

    expect(watchers.add).toHaveBeenCalledWith(7, [{ userId: 'caio', userName: 'Caio Reis' }], 'bia@azuos.com.br');
  });

  // feliz
  it('replaces the list and writes who came in and who left on the timeline', async () => {
    const { service, watchers, histories } = setup([{ userId: 'caio', userName: 'Caio Reis' }]);

    await service.replace(ticket, ['dani'], author);

    expect(watchers.add).toHaveBeenCalledWith(7, [{ userId: 'dani', userName: 'Dani Alves' }], author.email);
    expect(watchers.remove).toHaveBeenCalledWith(7, ['caio'], author.id);
    expect(histories.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        description: 'Vinculou: Dani Alves. Desvinculou: Caio Reis.',
        isVisibleToRequester: true,
      }),
    );
  });

  // feliz
  it('lets the requester and linked people reply, and offers them to be notified without the author', () => {
    const { service } = setup();
    const linked = [{ id: 'caio', name: 'Caio Reis' }];

    expect(service.canReply(ticket, linked, 'bia')).toBe(true);
    expect(service.canReply(ticket, linked, 'caio')).toBe(true);
    expect(service.notifiableOf(ticket, linked, 'bia')).toEqual([
      { id: 'caio', name: 'Caio Reis' },
      { id: 'ana', name: 'Ana Lima' },
    ]);
  });

  // triste
  it('does not let a stranger reply', () => {
    const { service } = setup();

    expect(service.canReply(ticket, [], 'dani')).toBe(false);
  });

  // triste
  it('refuses the whole change when someone is no longer active, and records nothing', async () => {
    const { service, watchers, histories } = setup();

    await expect(service.replace(ticket, ['caio', 'eva'], author)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(watchers.add).not.toHaveBeenCalled();
    expect(histories.record).not.toHaveBeenCalled();
  });

  // triste
  it('writes nothing when the list did not change', async () => {
    const { service, histories } = setup([{ userId: 'caio', userName: 'Caio Reis' }]);

    await service.replace(ticket, ['caio'], author);

    expect(histories.record).not.toHaveBeenCalled();
    expect(describeChange([], [])).toBe('');
  });
});

describe('TicketPeopleService.directoryWithPhotos', () => {
  function serviceWith(everyone: unknown, access: unknown) {
    return new TicketPeopleService(
      {
        listAllUsers: vi.fn(() => (everyone instanceof Error ? Promise.reject(everyone) : Promise.resolve(everyone))),
        listUsers: vi.fn().mockResolvedValue(access),
      } as unknown as UserDirectoryProvider,
      {} as TicketWatchersRepository,
      {} as TicketHistoriesRepository,
    );
  }

  // feliz
  /* O técnico que entra como super-admin não está na lista de acesso: o rosto dele vem do
     diretório inteiro, com a foto. */
  it('brings the photo of everyone in the directory, not only of who has access', async () => {
    const everyone = [
      { id: 'gs', name: 'Guilherme Siqueira', email: 'gs@azuos.com.br', image: 'https://x/gs.png' },
      ...directoryUsers,
    ];

    const people = await serviceWith(everyone, directoryUsers).directoryWithPhotos();

    expect(people).toContainEqual({ id: 'gs', name: 'Guilherme Siqueira', avatarUrl: 'https://x/gs.png' });
    expect(people.find((person) => person.id === 'bia')?.avatarUrl).toBe('https://x/bia.png');
  });

  // triste
  /* O diretório inteiro fora do ar não apaga as fotos de quem trabalha aqui. */
  it('keeps the photos of the access list when the whole directory is down', async () => {
    const people = await serviceWith(new Error('fora do ar'), directoryUsers).directoryWithPhotos();

    expect(people.find((person) => person.id === 'bia')?.avatarUrl).toBe('https://x/bia.png');
  });
});
