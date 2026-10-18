import { describe, expect, it } from 'vitest';

import { canChangeScheduleEvent } from './system-access.util';

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
