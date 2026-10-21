import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { describe, expect, it } from 'vitest';

import { schedulesByComputer } from './use-maintenance-schedule.svelte';

function schedule(computerId: number): MaintenanceSchedule {
  return {
    computerId,
    computerName: `PC-${computerId}`,
    computerDisplayName: null,
    computerDepartment: null,
    scheduledFor: '2026-11-05',
    note: null,
    createdAt: '2026-10-21T12:00:00.000Z',
    createdBy: 'suporte@teste.local',
    updatedAt: null,
    updatedBy: null,
  };
}

describe('schedulesByComputer', () => {
  // feliz
  it('finds each machine schedule by its id', () => {
    const map = schedulesByComputer([schedule(3), schedule(7)]);

    expect(map.get(7)?.computerName).toBe('PC-7');
    expect(map.size).toBe(2);
  });

  // triste
  it('answers an empty map while the list has not arrived', () => {
    expect(schedulesByComputer(undefined).size).toBe(0);
    expect(schedulesByComputer([]).get(3)).toBeUndefined();
  });
});
