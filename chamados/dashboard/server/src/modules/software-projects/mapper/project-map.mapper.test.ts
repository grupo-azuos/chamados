import { PROJECT_MAP_CLOSED_PER_TYPE } from '@template/shared/schemas/project-map.schema';
import { describe, expect, it } from 'vitest';

import { type SoftwareProjectRow } from '../../../lib/db/schema/software-projects.schema';
import { type SoftwareTimelineEventRow } from '../../../lib/db/schema/software-timeline-events.schema';
import { toProjectMap } from './project-map.mapper';

const project = {
  id: 1,
  name: 'Paralegal',
  repositoryUrl: 'grupo-azuos/paralegal',
  status: 'active',
} as SoftwareProjectRow;

const event = (id: number, over: Partial<SoftwareTimelineEventRow> = {}) =>
  ({
    id,
    projectId: 1,
    type: 'pr',
    externalId: `#${id}`,
    title: `PR ${id}`,
    status: 'merged',
    url: null,
    author: 'vini',
    authorName: 'Vinícius',
    eventDate: new Date('2026-11-20T10:00:00Z'),
    ...over,
  }) as SoftwareTimelineEventRow;

describe('project map mapper', () => {
  // feliz
  it('brings the events, the tickets with their issue and the tasks of those tickets', () => {
    const [entry] = toProjectMap({
      projects: [project],
      events: [event(1, { type: 'issue', status: 'open' })],
      tickets: [
        { id: 9, projectId: 1, status: 'open', description: 'Cache', githubIssueNumber: 1 },
      ],
      tasks: [
        { id: 4, title: 'Cache', status: 'open', ticketId: 9 },
        { id: 5, title: 'De outro', status: 'open', ticketId: 99 },
      ],
    });

    expect(entry).toMatchObject({
      project: { id: 1, name: 'Paralegal' },
      events: [{ id: 1, type: 'issue', author: 'Vinícius' }],
      hiddenEvents: 0,
      tickets: [{ id: 9, isClosed: false, githubIssueNumber: 1 }],
      tasks: [{ id: 4 }],
    });
  });

  // triste
  it('keeps every open event but only the most recent closed ones of each type', () => {
    const closed = Array.from({ length: PROJECT_MAP_CLOSED_PER_TYPE + 3 }, (_, index) =>
      event(index + 10),
    );
    const [entry] = toProjectMap({
      projects: [project],
      events: [event(1, { status: 'open' }), ...closed, event(99, { type: 'merge' })],
      tickets: [],
      tasks: [],
    });

    expect(entry!.events).toHaveLength(1 + PROJECT_MAP_CLOSED_PER_TYPE + 1);
    expect(entry!.hiddenEvents).toBe(3);
    expect(toProjectMap({ projects: [], events: [], tickets: [], tasks: [] })).toEqual([]);
  });
});
