import { type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { describe, expect, it } from 'vitest';

import {
  toScheduleFormValues,
  toScheduleInput,
} from './use-maintenance-schedule-form.svelte';

const schedule: MaintenanceSchedule = {
  computerId: 3,
  computerName: 'CONTABIL-03',
  computerDisplayName: null,
  computerDepartment: null,
  scheduledFor: '2026-11-05',
  note: 'Trocar pasta térmica',
  createdAt: '2026-10-21T12:00:00.000Z',
  createdBy: 'suporte@teste.local',
  updatedAt: null,
  updatedBy: null,
};

describe('toScheduleFormValues', () => {
  // feliz
  it('opens the reschedule with the current date and note', () => {
    expect(toScheduleFormValues(schedule)).toEqual({
      scheduledFor: '2026-11-05',
      note: 'Trocar pasta térmica',
    });
  });

  // triste
  it('opens blank when there is nothing scheduled', () => {
    expect(toScheduleFormValues(null)).toEqual({ scheduledFor: '', note: '' });
  });
});

describe('toScheduleInput', () => {
  // feliz
  it('sends the date and the trimmed note', () => {
    expect(toScheduleInput({ scheduledFor: '2026-11-05', note: '  limpeza  ' })).toEqual({
      scheduledFor: '2026-11-05',
      note: 'limpeza',
    });
  });

  // triste
  it('turns a blank note into null, never into stored spaces', () => {
    expect(toScheduleInput({ scheduledFor: '2026-11-05', note: '   ' }).note).toBeNull();
  });
});
