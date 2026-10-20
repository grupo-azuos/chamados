import { describe, expect, it } from 'vitest';

import { assignRoleSchema, assignRolesSchema, internalRoleSchema } from './internal-role.schema';

describe('internalRoleSchema', () => {
  // feliz
  it('accepts a module given to a person', () => {
    const parsed = internalRoleSchema.parse({
      id: 1,
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'ana@empresa.com.br',
      context: 'infra',
      createdAt: '2026-10-01T12:00:00.000Z',
      createdBy: 'super@empresa.com.br',
      updatedAt: null,
      updatedBy: null,
    });

    expect(parsed.context).toBe('infra');
  });

  // triste
  it('refuses a module that does not exist', () => {
    expect(
      internalRoleSchema.safeParse({
        id: 1,
        userId: 'usr_1',
        context: 'financeiro',
        createdAt: '2026-10-01T12:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('assignRoleSchema', () => {
  // feliz
  it('accepts a person and a module — the level comes from the admin-console', () => {
    expect(
      assignRoleSchema.parse({
        userId: 'usr_1',
        userEmail: 'ana@empresa.com.br',
        context: 'sistema',
      }),
    ).toEqual({ userId: 'usr_1', userEmail: 'ana@empresa.com.br', context: 'sistema' });
  });

  // triste
  /* Nível não se escolhe aqui: um campo de papel no corpo é descartado, nunca gravado. */
  it('drops a role sent in the body instead of trusting it', () => {
    const parsed = assignRoleSchema.parse({
      userId: 'usr_1',
      context: 'sistema',
      role: 'superadmin',
    });

    expect(parsed).not.toHaveProperty('role');
  });

  it('refuses an assignment without a person', () => {
    expect(assignRoleSchema.safeParse({ userId: '', context: 'infra' }).success).toBe(false);
  });
});


describe('assignRolesSchema', () => {
  // feliz
  it('accepts multiple modules for the same person without taking a role from the body', () => {
    const parsed = assignRolesSchema.parse({ userId: 'usr_1', userEmail: 'ana@empresa.com.br',
      contexts: ['infra', 'sistema'], role: 'superadmin' });
    expect(parsed.contexts).toEqual(['infra', 'sistema']);
    expect(parsed).not.toHaveProperty('role');
  });

  // triste
  it('requires an explicit nonempty selection', () => {
    expect(assignRolesSchema.safeParse({ userId: 'usr_1', contexts: [] }).success).toBe(false);
    expect(assignRolesSchema.safeParse({ userId: 'usr_1' }).success).toBe(false);
  });

  it('rejects duplicates and unknown modules', () => {
    expect(assignRolesSchema.safeParse({ userId: 'usr_1', contexts: ['infra', 'infra'] }).success).toBe(false);
    expect(assignRolesSchema.safeParse({ userId: 'usr_1', contexts: ['infra', 'financeiro'] }).success).toBe(false);
  });
});
