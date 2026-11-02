import { describe, expect, it } from 'vitest';

import { softwareTimelineEventSchema, softwareTimelineListQuerySchema } from './software-timeline.schema';

describe('software timeline contract', () => {
  // feliz
  it('accepts an event with the optional co-authors and project name', () => {
    expect(
      softwareTimelineEventSchema.safeParse({
        id: 1,
        projectId: 1,
        type: 'pr',
        externalId: '#1',
        title: 'PR',
        description: null,
        url: null,
        author: 'dev',
        status: 'open',
        eventDate: '2026-10-20T12:00:00.000Z',
        createdAt: '2026-10-20T12:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(softwareTimelineListQuerySchema.parse({ projectId: '3', type: 'merge' })).toMatchObject({
      projectId: 3,
      type: 'merge',
    });
  });

  // triste
  it('refuses a window that is not a date', () => {
    expect(softwareTimelineListQuerySchema.safeParse({ startAt: 'ontem' }).success).toBe(false);
  });
});
