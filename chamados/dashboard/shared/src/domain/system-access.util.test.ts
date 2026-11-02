import { describe, expect, it } from 'vitest';

import {
  canChangeScheduleEvent,
  canEditSystem,
  requiresSystemGithub,
  systemRole,
} from './system-access.util';

const ana = { id: 'u-ana', email: 'ana@empresa.com.br', role: 'admin' as const };

describe('canChangeScheduleEvent', () => {
  // feliz
  it('lets whoever marked the event change it', () => {
    expect(
      canChangeScheduleEvent(ana, { createdById: 'u-ana', createdByEmail: 'ana@empresa.com.br' }),
    ).toBe(true);
  });

  // feliz
  it('lets the super administrator change anyone’s event', () => {
    expect(
      canChangeScheduleEvent(
        { id: 'u-root', email: 'root@empresa.com.br', role: 'superadmin' },
        { createdById: 'u-bia', createdByEmail: 'bia@empresa.com.br' },
      ),
    ).toBe(true);
  });

  // feliz
  /* Agendamento antigo, de antes do id: vale o e-mail, sem diferenciar maiúscula. */
  it('falls back to the e-mail for events marked before the id existed', () => {
    expect(
      canChangeScheduleEvent(ana, { createdById: null, createdByEmail: 'Ana@Empresa.com.br' }),
    ).toBe(true);
  });

  // triste
  it('refuses another Sistema admin', () => {
    expect(
      canChangeScheduleEvent(ana, { createdById: 'u-bia', createdByEmail: 'bia@empresa.com.br' }),
    ).toBe(false);
  });

  // triste
  /* O id manda quando existe: o mesmo e-mail com outro id é outra pessoa. */
  it('does not trust the e-mail when the event has an owner id', () => {
    expect(
      canChangeScheduleEvent(ana, { createdById: 'u-outro', createdByEmail: 'ana@empresa.com.br' }),
    ).toBe(false);
  });
});

describe('systemRole', () => {
  // feliz
  it('reads the role in the System module, and the super admin above all', () => {
    expect(systemRole({ role: 'superadmin', roles: {} })).toBe('superadmin');
    expect(systemRole({ role: 'admin', roles: { sistema: 'admin' } })).toBe('admin');
    expect(canEditSystem({ role: 'admin', roles: { sistema: 'admin' } })).toBe(true);
    expect(requiresSystemGithub({ role: 'superadmin' })).toBe(true);
  });

  // triste
  it('leaves whoever has no module as a reader', () => {
    expect(systemRole({ role: 'admin' })).toBe('user');
    expect(canEditSystem({ role: 'manager', roles: { sistema: 'user' } })).toBe(false);
    expect(requiresSystemGithub({ role: 'admin', roles: { infra: 'admin' } })).toBe(false);
  });
});
