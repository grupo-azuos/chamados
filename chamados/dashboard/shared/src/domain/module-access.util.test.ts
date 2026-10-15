import { describe, expect, it } from 'vitest';

import { canWriteModule, hasModule, moduleRoleFor, modulesOf } from './module-access.util';

describe('moduleRoleFor', () => {
  // feliz
  it('lets only an Administrator write inside a module', () => {
    expect(moduleRoleFor('admin')).toBe('admin');
  });

  // triste
  /* Gestor e Usuário só consultam, e papel desconhecido cai no nível mais baixo. */
  it('makes Manager, User and anything unknown read-only', () => {
    expect(moduleRoleFor('manager')).toBe('user');
    expect(moduleRoleFor('user')).toBe('user');
    expect(moduleRoleFor('superadmin')).toBe('user');
    expect(moduleRoleFor('')).toBe('user');
    expect(moduleRoleFor(null)).toBe('user');
  });
});

describe('hasModule / canWriteModule', () => {
  const infraAdmin = { role: 'admin', roles: { infra: 'admin' } };
  const infraViewer = { role: 'manager', roles: { infra: 'user' } };

  // feliz
  it('lets an Administrator of the module read and write it', () => {
    expect(hasModule(infraAdmin, 'infra')).toBe(true);
    expect(canWriteModule(infraAdmin, 'infra')).toBe(true);
  });

  it('lets the super-admin into every module', () => {
    const superAdmin = { role: 'superadmin' };

    expect(modulesOf(superAdmin)).toEqual(['infra', 'sistema', 'manutencao']);
    expect(canWriteModule(superAdmin, 'manutencao')).toBe(true);
  });

  // triste
  it('lets a Manager of the module only read it', () => {
    expect(hasModule(infraViewer, 'infra')).toBe(true);
    expect(canWriteModule(infraViewer, 'infra')).toBe(false);
  });

  /* O papel geral não abre módulo: Administrador sem Sistema não entra em Sistema. */
  it('keeps an Administrator out of a module they were not given', () => {
    expect(hasModule(infraAdmin, 'sistema')).toBe(false);
    expect(canWriteModule(infraAdmin, 'sistema')).toBe(false);
    expect(modulesOf({ role: 'admin' })).toEqual([]);
  });

  it('gives nothing to nobody', () => {
    expect(hasModule(null, 'infra')).toBe(false);
    expect(canWriteModule(undefined, 'infra')).toBe(false);
    expect(modulesOf(null)).toEqual([]);
  });
});
