import { describe, expect, it } from 'vitest';

import {
  historyKindOf,
  historyQuerySchema,
  historyTargetLabel,
  historyTargetsOf,
} from './history.schema';

describe('history vocabulary', () => {
  // feliz
  it('tells what an action did by the verb of its handler', () => {
    expect(historyKindOf('tickets.createByRequester')).toBe('created');
    expect(historyKindOf('maintenances.remove')).toBe('archived');
    expect(historyKindOf('maintenances.restoreSchedule')).toBe('restored');
    expect(historyKindOf('tickets.update')).toBe('updated');
  });

  // triste
  it('counts an unknown verb, or an action without handler, as a change', () => {
    expect(historyKindOf('software-projects.sync')).toBe('updated');
    expect(historyKindOf('api')).toBe('updated');
  });

  // feliz
  it('names each resource in portuguese and keeps each module to its own', () => {
    expect(historyTargetLabel('maintenances')).toBe('Manutenção');
    expect(historyTargetsOf('infra')).toContain('computers');
    expect(historyTargetsOf('manutencao')).not.toContain('computers');
    expect(historyTargetsOf('manutencao')).toContain('tickets');
  });

  // triste
  it('falls back to "Registro" for a resource it does not know', () => {
    expect(historyTargetLabel('novidade')).toBe('Registro');
    expect(historyTargetLabel(null)).toBe('Registro');
  });
});

describe('historyQuerySchema', () => {
  // feliz
  it('reads the module and the filters of the screen', () => {
    const query = historyQuerySchema.parse({ module: 'infra', kind: 'created', actor: 'me', from: '2026-11-01' });

    expect(query).toMatchObject({ module: 'infra', kind: 'created', actor: 'me', page: 1 });
  });

  // triste
  it('refuses a list without module, a module that does not exist and a broken day', () => {
    expect(historyQuerySchema.safeParse({}).success).toBe(false);
    expect(historyQuerySchema.safeParse({ module: 'rh' }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ module: 'infra', from: '01/11/2026' }).success).toBe(false);
  });
});
