import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { type Database } from '../db/db.type';
import { internalRoles } from '../db/schema/internal-roles.schema';
import { superAdmins } from '../db/schema/super-admins.schema';
import {
  hasForwardedHeaders,
  IdentityProvider,
  readForwardedIdentity,
  type ForwardedIdentity,
} from './identity.provider';

const ANA_ID = '11111111-1111-4111-8111-111111111111';

const HEADERS = {
  'x-forwarded-user-id': ANA_ID,
  'x-forwarded-user-email': 'ana@empresa.com.br',
  'x-forwarded-user-name': 'Ana Souza',
  'x-forwarded-user-role': 'admin',
};

const ANA: ForwardedIdentity = {
  id: ANA_ID,
  email: 'ana@empresa.com.br',
  name: 'Ana Souza',
  role: 'admin',
};

type Rows = {
  modules?: { context: string }[];
  superAdmins?: { id: number; userId: string | null }[];
};

/** Finge o Drizzle para as duas leituras da identidade e a gravação do UUID do super-admin. */
function fakeDatabase(rows: Rows = {}): { db: Database; update: ReturnType<typeof vi.fn> } {
  const from = vi.fn((table) => ({
    where: vi
      .fn()
      .mockResolvedValue(
        table === internalRoles
          ? (rows.modules ?? [])
          : table === superAdmins
            ? (rows.superAdmins ?? [])
            : [],
      ),
  }));
  const where = vi.fn().mockResolvedValue([]);
  const update = vi.fn(() => ({ set: vi.fn(() => ({ where })) }));

  return { db: { select: vi.fn(() => ({ from })), update } as unknown as Database, update };
}

describe('readForwardedIdentity', () => {
  // feliz
  it('reads the person the admin-console forwarded', () => {
    expect(readForwardedIdentity(HEADERS)).toEqual(ANA);
  });

  it('reads nobody when nothing was forwarded', () => {
    expect(readForwardedIdentity({})).toBeNull();
    expect(hasForwardedHeaders({})).toBe(false);
  });

  // triste
  /* Cabeçalho pela metade é provedor mal configurado: nunca completar com outra coisa. */
  it('refuses a forwarded identity with a missing piece', () => {
    const { 'x-forwarded-user-email': _email, ...partial } = HEADERS;

    expect(readForwardedIdentity(partial)).toBeNull();
    expect(hasForwardedHeaders(partial)).toBe(true);
  });

  /* `superadmin` só existe no banco deste sistema: no cabeçalho é forjado, e não promove. */
  it('refuses a forwarded super-admin role instead of promoting anyone', () => {
    expect(readForwardedIdentity({ ...HEADERS, 'x-forwarded-user-role': 'superadmin' })).toBeNull();
  });

  it('refuses an id that is not the UUID the admin-console sends', () => {
    expect(readForwardedIdentity({ ...HEADERS, 'x-forwarded-user-id': 'ana' })).toBeNull();
  });
});

describe('IdentityProvider', () => {
  // feliz
  it('gives an Administrator full access to the modules they were given, and only those', async () => {
    const { db } = fakeDatabase({ modules: [{ context: 'infra' }, { context: 'manutencao' }] });

    const user = await new IdentityProvider(db).resolve(ANA);

    expect(user).toMatchObject({ id: ANA_ID, role: 'admin' });
    expect(user?.roles).toEqual({ infra: 'admin', manutencao: 'admin' });
  });

  it('makes a Manager with a module read-only there', async () => {
    const { db } = fakeDatabase({ modules: [{ context: 'infra' }] });

    const user = await new IdentityProvider(db).resolve({ ...ANA, role: 'manager' });

    expect(user?.roles).toEqual({ infra: 'user' });
  });

  it('gives the super-admin every module, and records the UUID the first time', async () => {
    const { db, update } = fakeDatabase({ superAdmins: [{ id: 7, userId: null }] });

    const user = await new IdentityProvider(db).resolve({ ...ANA, role: 'user' });

    expect(user?.role).toBe('superadmin');
    expect(user?.roles).toEqual({ infra: 'admin', sistema: 'admin', manutencao: 'admin' });
    expect(update).toHaveBeenCalledTimes(1);
  });

  // triste
  /* Ser Administrador no admin-console não abre módulo nenhum: sem módulo, só o público. */
  it('gives nothing but the public screens to an Administrator without modules', async () => {
    const { db } = fakeDatabase();

    const user = await new IdentityProvider(db).resolve(ANA);

    expect(user?.role).toBe('user');
    expect(user?.roles).toEqual({});
  });

  // feliz
  /* Trocar de e-mail no admin-console não tira o super-admin: a linha já tem o UUID dela. */
  it('keeps the super-admin after an e-mail change, without recording the UUID again', async () => {
    const { db, update } = fakeDatabase({ superAdmins: [{ id: 7, userId: ANA_ID }] });

    const user = await new IdentityProvider(db).resolve({
      ...ANA,
      email: 'ana.nova@empresa.com.br',
    });

    expect(user?.role).toBe('superadmin');
    expect(update).not.toHaveBeenCalled();
  });

  // triste
  /* Os módulos são procurados só pelo UUID: o e-mail não entra na consulta, então um e-mail
     antigo herdado por outra pessoa não leva junto os módulos de quem o usava. */
  it('looks the modules up by the UUID alone, never by the e-mail', async () => {
    const moduleWhere = vi.fn().mockResolvedValue([]);
    const from = vi.fn((table) => ({
      where: table === internalRoles ? moduleWhere : vi.fn().mockResolvedValue([]),
    }));
    const db = { select: vi.fn(() => ({ from })), update: vi.fn() } as unknown as Database;

    await new IdentityProvider(db).resolve(ANA);

    expect(moduleWhere).toHaveBeenCalledWith(eq(internalRoles.userId, ANA_ID));
  });

  /* Uma linha de super-admin já reclamada por OUTRO UUID não promove quem herdou o e-mail. */
  it('does not promote someone who reuses the e-mail of a claimed super-admin', async () => {
    const { db, update } = fakeDatabase({
      superAdmins: [{ id: 7, userId: '22222222-2222-4222-8222-222222222222' }],
    });

    const user = await new IdentityProvider(db).resolve(ANA);

    expect(user?.role).toBe('user');
    expect(update).not.toHaveBeenCalled();
  });
});
