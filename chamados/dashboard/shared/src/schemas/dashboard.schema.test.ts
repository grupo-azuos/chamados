import { describe, expect, it } from 'vitest';

import { dashboardQuerySchema, dashboardSchema, DEFAULT_PERIOD_DAYS } from './dashboard.schema';

const PERIODS = { day: [], week: [], month: [] };

const SUMMARY = {
  days: 30,
  park: { total: 3, critical: 1, attention: 0, neverSeen: 2 },
  tickets: { open: 4, inProgress: 1, openedInPeriod: 6, resolvedInPeriod: 1, averageResolutionHours: null },
  maintenance: { doneInPeriod: 4, preventiveDue: 1 },
  parts: { kinds: 2, items: 3, outOfStock: 1 },
  worstMachines: [
    {
      computerId: 1,
      computerName: 'PC-01',
      computerDisplayName: null,
      department: null,
      healthScore: 40,
      healthStatus: 'critical',
      activeAlerts: 1,
      maintenanceCount: 3,
    },
  ],
  byProblemType: [{ key: 'printer', count: 2 }],
  byDepartment: [],
  daily: [{ day: '2026-10-20', opened: 1, resolved: 0, maintenances: 1 }],
  panels: {
    recurringByPerson: [{ requesterName: 'Joana', department: null, problemType: 'email', count: 3 }],
    recurringByMachine: [{ computerId: 1, computerName: 'PC-01', problemType: 'printer', count: 3 }],
    heavyMaintenance: [{ computerId: 1, computerName: 'PC-01', maintenanceCount: 3 }],
    peaking: [{ computerId: 1, computerName: 'PC-01', today: 1, month: 4, topMetric: 'cpu' }],
    maintenanceLog: PERIODS,
    maintenanceByType: PERIODS,
    plannedToday: [
      {
        computerId: 1,
        computerName: 'PC-01',
        department: null,
        plannedFor: '2026-10-20T12:00:00.000Z',
        monthsSinceLast: null,
      },
    ],
    doneToday: false,
    scheduled: [
      { computerId: 1, computerName: 'PC-01', department: null, scheduledFor: '2026-10-21', note: null },
    ],
  },
};

describe('dashboard contract', () => {
  // feliz
  it('accepts the whole panel the API answers', () => {
    expect(dashboardSchema.safeParse(SUMMARY).success).toBe(true);
  });

  it('reads the period from the query, with a default', () => {
    expect(dashboardQuerySchema.parse({})).toEqual({ days: DEFAULT_PERIOD_DAYS });
    expect(dashboardQuerySchema.parse({ days: '7' })).toEqual({ days: 7 });
  });

  // triste
  it('refuses a period outside the limits', () => {
    expect(dashboardQuerySchema.safeParse({ days: 0 }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ days: 400 }).success).toBe(false);
  });
});
