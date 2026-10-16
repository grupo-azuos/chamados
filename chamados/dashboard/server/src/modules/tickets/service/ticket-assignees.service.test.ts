import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { describe, expect, it, vi } from 'vitest';

import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type Env } from '../../../lib/config/env.schema';
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
/** Um módulo liberado — sem nível: quem escreve é o Administrador do admin-console. */
const grant = (userId: string, context: string, userEmail: string | null = null) =>
  ({ userId, userEmail, context }) as InternalRoleRow;

/* O papel de cada um é o do admin-console (`role` da lista de acesso de lá). O super-admin é
   daqui: mora em `super_admins`, e na lista do admin-console ele é uma pessoa qualquer. */
const USERS = [
  user('u-super', 'Zeca Super'),
  user('u-infra', 'Bia Infra', { role: 'admin' }),
  user('u-both', 'Ana Duas', { role: 'admin' }),
  user('u-manager', 'Caio Gestor', { role: 'manager' }),
  user('u-banned', 'Dora Banida', { role: 'admin', banned: true }),
  user('u-plain', 'Edu Comum'),
];
const ROLES = [
  grant('u-infra', 'infra'),
  grant('u-both', 'infra'),
  grant('u-both', 'sistema'),
  /* Linha de outra pessoa, gravada com um e-mail que hoje é da Ana: não pode valer para ela. */
  grant('other-id', 'manutencao', 'U-BOTH@exemplo.com'),
  grant('u-manager', 'infra'),
  grant('u-banned', 'infra'),
];
const SUPER_ADMINS = [{ userId: null, userEmail: 'u-super@exemplo.com' }];

function makeService(
  users = USERS,
  roles = ROLES,
  env: Partial<Env> = { NODE_ENV: 'test' },
  superAdmins: { userId: string | null; userEmail: string }[] = SUPER_ADMINS,
) {
  const directory = {
    listUsers: vi.fn().mockResolvedValue(users),
    getUserById: vi.fn(async (id: string) => users.find((item) => item.id === id) ?? null),
  };
  const repository = {
    list: vi.fn().mockResolvedValue(roles),
    listSuperAdmins: vi.fn().mockResolvedValue(superAdmins),
  };

  return new TicketAssigneesService(
    directory as unknown as UserDirectoryProvider,
    repository as unknown as RolesRepository,
    env as Env,
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

  // triste
  /* O vínculo é pelo UUID: um e-mail antigo que hoje é de outra pessoa não a faz responsável. */
  it('does not give a module through an e-mail that belongs to someone else now', async () => {
    expect(await makeService().listForArea('manutencao')).toEqual([
      { id: 'u-super', name: 'Zeca Super' },
    ]);
  });

  // feliz
  /* Trocar de e-mail no admin-console não tira o super-admin já vinculado ao UUID. */
  it('keeps a claimed super admin after an e-mail change', async () => {
    const renamed = [user('u-super', 'Zeca Super', { email: 'novo@exemplo.com' })];
    const service = makeService(renamed, [], { NODE_ENV: 'test' }, [
      { userId: 'u-super', userEmail: 'u-super@exemplo.com' },
    ]);

    expect(await service.listForArea('sistema')).toEqual([{ id: 'u-super', name: 'Zeca Super' }]);
  });

  // triste
  /* E quem herdou o e-mail de um super-admin já vinculado não vira super-admin. */
  it('does not make super admin whoever reuses a claimed e-mail', async () => {
    const heir = [user('u-heir', 'Novo Dono', { email: 'u-super@exemplo.com' })];
    const service = makeService(heir, [], { NODE_ENV: 'test' }, [
      { userId: 'u-super', userEmail: 'u-super@exemplo.com' },
    ]);

    expect(await service.listForArea('sistema')).toEqual([]);
  });

  // triste
  /* Admin de Infra não aparece num chamado de Manutenção: só o super admin atende as três. */
  it('leaves out the admin of another area', async () => {
    expect(await makeService().listForArea('manutencao')).toEqual([
      { id: 'u-super', name: 'Zeca Super' },
    ]);
  });

  /* Gestor da área só consulta: não é oferecido como responsável. */
  it('leaves out managers, regular users and banned accounts', async () => {
    const ids = (await makeService().listForArea('infra')).map((option) => option.id);

    expect(ids).not.toContain('u-manager');
    expect(ids).not.toContain('u-plain');
    expect(ids).not.toContain('u-banned');
  });

  it('answers an empty list when nobody attends the area (edge case)', async () => {
    expect(await makeService([user('u-plain', 'Edu Comum')], []).listForArea('infra')).toEqual([]);
  });

  // triste
  /* Em produção, a linha que a máquina de quem programa deixou no banco compartilhado não
     transforma a pessoa de desenvolvimento em responsável. */
  it('ignores the development person grants in production', async () => {
    const devUser = user('00000000-0000-0000-0000-000000000001', 'Dev', {
      email: 'dev@chamados.local',
      role: 'admin',
    });
    const service = makeService([devUser], [grant(devUser.id, 'infra')], {
      NODE_ENV: 'production',
    });

    expect(await service.listForArea('infra')).toEqual([]);
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
