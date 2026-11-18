import { describe, expect, it } from 'vitest';

import {
  createSoftwareScheduleEventSchema,
  softwareScheduleFormSchema,
  softwareScheduleQuerySchema,
  updateSoftwareScheduleEventSchema,
} from './software-schedule.schema';

const APPOINTMENT = { title: 'Deploy', date: '2026-10-20', startTime: '09:00', endTime: '10:00' };

describe('software schedule contract', () => {
  // feliz
  it('fills the defaults of an appointment', () => {
    expect(createSoftwareScheduleEventSchema.parse(APPOINTMENT)).toMatchObject({
      kind: 'appointment',
      category: 'other',
      color: 'blue',
    });
  });

  it('accepts a record without an end, and a partial update', () => {
    expect(
      createSoftwareScheduleEventSchema.safeParse({ ...APPOINTMENT, kind: 'record', endTime: null }).success,
    ).toBe(true);
    expect(updateSoftwareScheduleEventSchema.parse({ title: 'Novo' })).toEqual({ title: 'Novo' });
    expect(softwareScheduleQuerySchema.parse({ startDate: '2026-10-19', endDate: '2026-10-25' })).toBeTruthy();
  });

  // triste
  it('refuses an end before the start, on the API and on the form', () => {
    const refused = createSoftwareScheduleEventSchema.safeParse({ ...APPOINTMENT, endTime: '08:00' });
    expect(refused.success).toBe(false);
    expect(refused.success ? [] : refused.error.issues.map((issue) => issue.path)).toEqual([['endTime']]);

    expect(
      softwareScheduleFormSchema.safeParse({
        kind: 'appointment',
        title: 'X',
        category: 'other',
        color: 'blue',
        date: '2026-10-20',
        startTime: '09:00',
        endTime: '08:00',
      }).success,
    ).toBe(false);
    expect(softwareScheduleQuerySchema.safeParse({ startDate: '20/10/2026', endDate: 'x' }).success).toBe(false);
  });
});
