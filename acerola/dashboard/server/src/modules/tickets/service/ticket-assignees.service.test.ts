import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { describe, expect, it, vi } from 'vitest';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory/user-directory.interface';
import { type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';
import { type RolesRepository } from '../../roles/repository/roles.repository';
import { TicketAssigneesService } from './ticket-assignees.service';

const user = (id: string, name: string, extra: Partial<DirectoryUser> = {}): DirectoryUser => ({
  id,
  name,
  email: `${id}@exemplo.com`,
  role: 'user',
  ...extra,
});
const role = (userId: string, context: string, roleName: string, userEmail: string | null = null) =>
  ({ userId, userEmail, context, role: roleName }) as InternalRoleRow;

const USERS = [
  user('u-super', 'Zeca Super', { role: 'superadmin' }),
  user('u-infra', 'Bia Infra'),
  user('u-both', 'Ana Duas'),
  user('u-manager', 'Caio Gestor'),
  user('u-banned', 'Dora Banida', { banned: true }),
  user('u-plain', 'Edu Comum'),
];
const ROLES = [
  role('u-infra', 'infra', 'admin'),
  role('u-both', 'infra', 'admin'),
  role('other-id', 'sistema', 'admin', 'U-BOTH@exemplo.com'),
  role('u-manager', 'infra', 'manager'),
  role('u-banned', 'infra', 'admin'),
];

function makeService(users = USERS, roles = ROLES) {
  const directory = {
    listUsers: vi.fn().mockResolvedValue(users),
    getUserById: vi.fn(async (id: string) => users.find((item) => item.id === id) ?? null),
  };
  const repository = { list: vi.fn().mockResolvedValue(roles) };

  return new TicketAssigneesService(
    directory as unknown as UserDirectoryProvider,
    repository as unknown as RolesRepository,
  );
}

describe('TicketAssigneesService.listForArea', () => {
  // feliz
  it('lists the admins of the area plus the super admins, by name', async () => {
    expect(await makeService().listForArea('infra')).toEqual([
      { id: 'u-both', name: 'Ana Duas' },
      { id: 'u-infra', name: 'Bia Infra' },
      { id: 'u-super', name: 'Zeca Super' },
    ]);
  });

  /* O cargo interno pode estar gravado pelo e-mail, e não pelo id: vale do mesmo jeito. */
  it('matches a role recorded by e-mail, whatever the case', async () => {
    expect(await makeService().listForArea('sistema')).toEqual([
      { id: 'u-both', name: 'Ana Duas' },
      { id: 'u-super', name: 'Zeca Super' },
    ]);
  });

  // triste
  /* Admin de Infra não aparece num chamado de Manutenção: só o super admin atende as três. */
  it('leaves out the admin of another area', async () => {
    expect(await makeService().listForArea('manutencao')).toEqual([
      { id: 'u-super', name: 'Zeca Super' },
    ]);
  });

  it('leaves out managers, regular users and banned accounts', async () => {
    const ids = (await makeService().listForArea('infra')).map((option) => option.id);

    expect(ids).not.toContain('u-manager');
    expect(ids).not.toContain('u-plain');
    expect(ids).not.toContain('u-banned');
  });

  it('answers an empty list when nobody attends the area (edge case)', async () => {
    expect(await makeService([user('u-plain', 'Edu Comum')], []).listForArea('infra')).toEqual([]);
  });
});

describe('TicketAssigneesService.resolve', () => {
  // feliz
  it('finds a person who attends the area', async () => {
    expect(await makeService().resolve('infra', 'u-infra')).toEqual({
      id: 'u-infra',
      name: 'Bia Infra',
    });
  });

  // triste
  /* O id vem de uma tela pública: quem não atende a área não vira responsável só por pedir. */
  it('refuses a person of another area, a regular user and an unknown id', async () => {
    const service = makeService();

    expect(await service.resolve('sistema', 'u-infra')).toBeNull();
    expect(await service.resolve('infra', 'u-plain')).toBeNull();
    expect(await service.resolve('infra', 'ghost')).toBeNull();
  });
});

describe('TicketAssigneesService.areasOf', () => {
  // feliz
  it('tells every area of a super admin, and only the own ones of an admin', async () => {
    const service = makeService();

    expect(await service.areasOf('u-super')).toEqual({
      name: 'Zeca Super',
      areas: ['infra', 'sistema', 'manutencao'],
    });
    expect(await service.areasOf('u-infra')).toEqual({ name: 'Bia Infra', areas: ['infra'] });
    expect((await service.areasOf('u-both'))?.areas).toEqual(['infra', 'sistema']);
  });

  // triste
  it('tells no area for who administers none, and null for banned or unknown', async () => {
    const service = makeService();

    expect((await service.areasOf('u-plain'))?.areas).toEqual([]);
    expect(await service.areasOf('u-banned')).toBeNull();
    expect(await service.areasOf('ghost')).toBeNull();
  });
});
