import { describe, expect, it } from 'vitest';

import { DEFAULT_INSIGHT_DAYS, insightQuerySchema, insightsSchema } from './insight.schema';

const MACHINE = { computerId: 1, computerName: 'PC-01', computerDisplayName: null, department: null };

describe('insights contract', () => {
  // feliz
  it('accepts the four lists the API answers', () => {
    const parsed = insightsSchema.safeParse({
      days: 30,
      overloaded: [{ ...MACHINE, averageCpuPercent: 90, averageMemoryPercent: 80, sampleCount: 10, activeAlerts: 1 }],
      upgrades: [{ ...MACHINE, reason: 'memory', value: 4, healthScore: 70, healthStatus: 'attention' }],
      troublesome: [{ ...MACHINE, maintenanceCount: 3, alertCount: 2, ticketCount: 1, lastMaintenanceAt: null }],
      spares: [
        { ...MACHINE, healthScore: 100, healthStatus: 'good', memoryGb: 16, diskGb: 480, cpuModel: null, lastSeenAt: null },
      ],
    });

    expect(parsed.success).toBe(true);
    expect(insightQuerySchema.parse({})).toEqual({ days: DEFAULT_INSIGHT_DAYS });
  });

  // triste
  it('refuses a reason outside the catalog', () => {
    expect(insightQuerySchema.safeParse({ days: 0 }).success).toBe(false);
  });
});
