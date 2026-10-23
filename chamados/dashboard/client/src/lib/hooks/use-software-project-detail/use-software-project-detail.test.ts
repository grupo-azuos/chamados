import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { describe, expect, it } from 'vitest';

import { projectProgressOf, timelineDaysOf } from './use-software-project-detail.svelte';

function event(over: Partial<SoftwareTimelineEvent>): SoftwareTimelineEvent {
  return {
    id: 1,
    projectId: 1,
    type: 'pr',
    externalId: '#1',
    title: 'Tela nova',
    description: null,
    url: null,
    author: 'ana',
    authorName: 'Ana Lima',
    status: 'merged',
    eventDate: '2026-10-21T14:00:00.000Z',
    createdAt: '2026-10-21T14:00:00.000Z',
    ...over,
  };
}

const NOW = Date.parse('2026-10-23T12:00:00.000Z');

describe('projectProgressOf', () => {
  // feliz
  it('tells what is open now and what was delivered in the week', () => {
    const progress = projectProgressOf(
      [
        event({ id: 1, status: 'open', eventDate: '2026-10-22T10:00:00.000Z' }),
        event({ id: 2, type: 'issue', status: 'open' }),
        event({ id: 3, type: 'merge' }),
        event({ id: 4 }),
        event({ id: 5, eventDate: '2026-09-01T10:00:00.000Z' }),
      ],
      NOW,
    );

    expect(progress.openPullRequests.map((item) => item.id)).toEqual([1]);
    expect(progress.openIssues.map((item) => item.id)).toEqual([2]);
    expect(progress.deliveredLastWeek).toBe(2);
    expect(progress.lastActivityAt).toBe('2026-10-22T10:00:00.000Z');
  });

  // triste
  it('answers an empty progress for a system with nothing synced', () => {
    expect(projectProgressOf([], NOW)).toEqual({
      openPullRequests: [],
      openIssues: [],
      deliveredLastWeek: 0,
      lastActivityAt: null,
    });
  });
});

describe('timelineDaysOf', () => {
  // feliz
  it('groups by day, newest first', () => {
    const days = timelineDaysOf(
      [
        event({ id: 1, eventDate: '2026-10-20T15:00:00.000Z' }),
        event({ id: 2, eventDate: '2026-10-22T15:00:00.000Z' }),
        event({ id: 3, eventDate: '2026-10-22T16:00:00.000Z' }),
      ],
      '',
    );

    expect(days.map((day) => day.events.map((item) => item.id))).toEqual([[3, 2], [1]]);
  });

  // triste
  it('keeps only the type asked, and no empty day', () => {
    const days = timelineDaysOf([event({ id: 1 }), event({ id: 2, type: 'issue' })], 'merge');

    expect(days).toEqual([]);
  });
});
