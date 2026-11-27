import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  canAttendTicket,
  canCreate,
  canManageAnyRecord,
  canManageInContext,
  canModifyRecord,
  canRead,
  getRoleInContext,
  isAdmin,
  isOwnRecord,
  isSuperAdmin,
} from './access.policy';
import {
  assertCanAttendTicket,
  assertCanCreate,
  assertCanModifyRecord,
  assertIsAdmin,
  assertIsSuperAdmin,
} from './policy-assert.util';

const ANA = 'ana@empresa.com.br';
const BIA = 'bia@empresa.com.br';

describe('access.policy', () => {
  // feliz
  it('lets every role read, and only the administrator register', () => {
    for (const role of ['user', 'manager', 'admin', 'superadmin'] as const) {
      expect(canRead(role)).toBe(true);
    }
    expect(canCreate('admin')).toBe(true);
    expect(canCreate('superadmin')).toBe(true);
  });

  // triste
  /* O gestor acompanha pelos painéis; o usuário só abre chamado. */
  it('keeps the manager and the user out of registering and editing', () => {
    expect(canCreate('manager')).toBe(false);
    expect(canCreate('user')).toBe(false);
    expect(canManageAnyRecord('manager')).toBe(false);
    expect(canManageAnyRecord('user')).toBe(false);
    expect(canManageAnyRecord('admin')).toBe(true);
    expect(canManageAnyRecord('superadmin')).toBe(true);
  });

  it('knows who is an admin or superadmin', () => {
    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('superadmin')).toBe(true);
    expect(isAdmin('manager')).toBe(false);
    expect(isSuperAdmin('superadmin')).toBe(true);
    expect(isSuperAdmin('admin')).toBe(false);
  });

  // triste
  /* Fechado por padrão: sem papel, nada passa. */
  it('closes everything when there is no role', () => {
    expect(canRead(null)).toBe(false);
    expect(canCreate(undefined)).toBe(false);
    expect(canManageAnyRecord(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(canModifyRecord(null, ANA, ANA)).toBe(false);
  });
});

describe('isOwnRecord', () => {
  // feliz
  it('matches e-mails ignoring case and surrounding spaces', () => {
    expect(isOwnRecord('Ana@Empresa.com.br', ' ana@empresa.com.br ')).toBe(true);
  });

  // triste
  it('never matches when one side is missing', () => {
    expect(isOwnRecord(null, ANA)).toBe(false);
    expect(isOwnRecord(ANA, null)).toBe(false);
  });
});

describe('canModifyRecord', () => {
  // feliz
  it('lets the administrator change any record', () => {
    expect(canModifyRecord('admin', BIA, ANA)).toBe(true);
    expect(canModifyRecord('superadmin', BIA, null)).toBe(true);
  });

  // triste
  /* Ser o autor não dá ao gestor o que o papel dele não dá. */
  it('stops the manager and the user even on their own record', () => {
    expect(canModifyRecord('user', ANA, ANA)).toBe(false);
    expect(canModifyRecord('manager', ANA, ANA)).toBe(false);
    expect(canModifyRecord('manager', BIA, ANA)).toBe(false);
  });

  // triste
  it('stops a plain user on someone else record', () => {
    expect(canModifyRecord('user', BIA, ANA)).toBe(false);
  });

  /* Registro sem autor gravado não vira "de todo mundo": só o administrador mexe nele. */
  it('does not turn an authorless record into everyone record', () => {
    expect(canModifyRecord('user', BIA, null)).toBe(false);
    expect(canModifyRecord('admin', BIA, null)).toBe(true);
  });
});

describe('policy-assert', () => {
  // feliz
  it('says nothing when the action is allowed', () => {
    expect(() => assertCanCreate('admin', 'computadores')).not.toThrow();
    expect(() => assertCanModifyRecord('admin', BIA, ANA, 'Esta manutenção')).not.toThrow();
    expect(() => assertIsAdmin('admin', 'Gerenciar pessoas')).not.toThrow();
    expect(() => assertIsAdmin('superadmin', 'Gerenciar pessoas')).not.toThrow();
    expect(() => assertIsSuperAdmin('superadmin', 'Atribuir cargos')).not.toThrow();
  });

  // triste
  /* A mensagem é parte da regra: ela precisa dizer o que resolve, não só "sem permissão". */
  it('explains that only the administrator changes a record', () => {
    expect(() => assertCanModifyRecord('manager', BIA, ANA, 'Esta manutenção')).toThrow(
      ForbiddenException,
    );
    expect(() => assertCanModifyRecord('manager', BIA, ANA, 'Esta manutenção')).toThrow(
      /administrador/i,
    );
    expect(() => assertCanCreate('manager', 'computadores')).toThrow(/painéis/i);
  });

  it('refuses an admin action for a manager', () => {
    expect(() => assertIsAdmin('manager', 'Gerenciar pessoas')).toThrow(ForbiddenException);
  });

  it('refuses a superadmin action for an admin or manager', () => {
    expect(() => assertIsSuperAdmin('admin', 'Atribuir cargos')).toThrow(ForbiddenException);
    expect(() => assertIsSuperAdmin('manager', 'Atribuir cargos')).toThrow(ForbiddenException);
    expect(() => assertIsSuperAdmin('user', 'Atribuir cargos')).toThrow(ForbiddenException);
  });
});

describe('canAttendTicket', () => {
  // feliz
  it('lets anyone on the IT panel attend, because a ticket has no owner on this side', () => {
    expect(canAttendTicket('user')).toBe(true);
    expect(canAttendTicket('manager')).toBe(true);
    expect(canAttendTicket('admin')).toBe(true);
  });

  // triste
  it('refuses someone with no role at all', () => {
    expect(canAttendTicket(null)).toBe(false);
    expect(canAttendTicket(undefined)).toBe(false);
  });
});

describe('assertCanAttendTicket', () => {
  // feliz
  it('lets an identified person through', () => {
    expect(() => assertCanAttendTicket('user')).not.toThrow();
  });

  // triste
  it('refuses a request with no identity, saying what was being attempted', () => {
    expect(() => assertCanAttendTicket(null)).toThrow(ForbiddenException);
    expect(() => assertCanAttendTicket(null)).toThrow(/atender chamados/i);
  });
});

describe('getRoleInContext & canManageInContext', () => {
  const user = {
    role: 'admin' as const,
    roles: {
      infra: 'user' as const,
      sistema: 'admin' as const,
      manutencao: 'manager' as const,
    },
  };

  // feliz
  it('resolves different roles for different contexts, and only the admin one manages', () => {
    expect(getRoleInContext(user, 'infra')).toBe('user');
    expect(getRoleInContext(user, 'sistema')).toBe('admin');
    expect(getRoleInContext(user, 'manutencao')).toBe('manager');

    expect(canManageInContext(user, 'infra')).toBe(false);
    expect(canManageInContext(user, 'sistema')).toBe(true);
    expect(canManageInContext(user, 'manutencao')).toBe(false);
  });

  // triste
  /* Sem pessoa, sem módulo: nunca o papel mínimo de graça. */
  it('gives no role to nobody', () => {
    expect(getRoleInContext(null, 'infra')).toBeNull();
    expect(canManageInContext(null, 'manutencao')).toBe(false);
  });
});
