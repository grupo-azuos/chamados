import { describe, expect, it } from 'vitest';

import { type SoftwareProjectRow } from '../../../lib/db/schema/software-projects.schema';
import { type SoftwareScheduleEventRow } from '../../../lib/db/schema/software-schedule-events.schema';
import { type SoftwareTimelineEventRow } from '../../../lib/db/schema/software-timeline-events.schema';
import {
  toSoftwareProject,
  toSoftwareProjectInsert,
  toSoftwareProjectUpdate,
  toSoftwareScheduleEvent,
  toSoftwareTimelineEvent,
} from './software-projects.mapper';

const NOW = new Date('2026-10-20T12:00:00.000Z');

function projectRow(overrides: Partial<SoftwareProjectRow> = {}): SoftwareProjectRow {
  return {
    id: 1,
    name: 'Chamados',
    description: null,
    repositoryUrl: 'https://github.com/org/chamados',
    status: 'active',
    color: 'blue',
    githubRepoOwner: null,
    githubRepoName: null,
    responsibleId: null,
    responsibleName: null,
    createdAt: NOW,
    createdBy: 'ti@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  } as SoftwareProjectRow;
}

describe('toSoftwareProject', () => {
  // feliz
  it('reads owner and repository from the link when the row does not have them', () => {
    const project = toSoftwareProject(projectRow(), 2, 3);

    expect(project).toMatchObject({
      githubRepoOwner: 'org',
      githubRepoName: 'chamados',
      openTicketsCount: 2,
      pullRequestsCount: 3,
      updatedAt: null,
    });
  });

  it('prefers what the row says, and formats the update date', () => {
    const project = toSoftwareProject(
      projectRow({ githubRepoOwner: 'outra', githubRepoName: 'coisa', updatedAt: NOW }),
    );

    expect(project).toMatchObject({
      githubRepoOwner: 'outra',
      githubRepoName: 'coisa',
      openTicketsCount: 0,
      updatedAt: NOW.toISOString(),
    });
  });

  // triste
  it('leaves owner and repository empty when the link is not from GitHub', () => {
    const project = toSoftwareProject(projectRow({ repositoryUrl: 'sem-link' }));

    expect(project).toMatchObject({ githubRepoOwner: null, githubRepoName: null });
  });
});

describe('toSoftwareProjectInsert', () => {
  // feliz
  it('trims the texts and splits the repository, with the responsible when there is one', () => {
    const insert = toSoftwareProjectInsert(
      {
        name: '  Chamados ',
        description: '  O sistema.  ',
        repositoryUrl: ' org/chamados ',
        status: 'active',
        color: 'green',
      },
      'ana@empresa.com.br',
      { id: 'u1', name: 'Dora' },
    );

    expect(insert).toEqual({
      name: 'Chamados',
      description: 'O sistema.',
      repositoryUrl: 'org/chamados',
      status: 'active',
      color: 'green',
      githubRepoOwner: 'org',
      githubRepoName: 'chamados',
      responsibleId: 'u1',
      responsibleName: 'Dora',
      createdBy: 'ana@empresa.com.br',
    });
  });

  // triste
  it('turns a blank description into null and leaves the responsible empty', () => {
    const insert = toSoftwareProjectInsert(
      { name: 'X', description: '   ', repositoryUrl: 'nada', status: 'active', color: 'blue' },
      'ana@empresa.com.br',
    );

    expect(insert).toMatchObject({
      description: null,
      githubRepoOwner: null,
      githubRepoName: null,
      responsibleId: null,
      responsibleName: null,
    });
  });
});

describe('toSoftwareProjectUpdate', () => {
  // feliz
  it('writes only what came in the body, re-reading the repository', () => {
    const update = toSoftwareProjectUpdate(
      { name: ' Novo ', description: '  Desc ', repositoryUrl: ' https://github.com/a/b ' },
      'ana@empresa.com.br',
      NOW,
      { id: 'u2', name: 'Edu' },
    );

    expect(update).toEqual({
      updatedAt: NOW,
      updatedBy: 'ana@empresa.com.br',
      name: 'Novo',
      description: 'Desc',
      repositoryUrl: 'https://github.com/a/b',
      githubRepoOwner: 'a',
      githubRepoName: 'b',
      responsibleId: 'u2',
      responsibleName: 'Edu',
    });
  });

  it('removes the responsible with null and keeps it with undefined', () => {
    const removed = toSoftwareProjectUpdate({}, 'ana@empresa.com.br', NOW, null);
    expect(removed).toMatchObject({ responsibleId: null, responsibleName: null });

    const kept = toSoftwareProjectUpdate({ status: 'deprecated' }, 'ana@empresa.com.br', NOW);
    expect(kept).toEqual({ updatedAt: NOW, updatedBy: 'ana@empresa.com.br', status: 'deprecated' });
  });

  // triste
  it('clears the description with a blank text and the repository parts with a plain link', () => {
    const update = toSoftwareProjectUpdate(
      { description: '  ', repositoryUrl: 'sem-link', color: 'amber' },
      'ana@empresa.com.br',
      NOW,
    );

    expect(update).toMatchObject({
      description: null,
      repositoryUrl: 'sem-link',
      githubRepoOwner: null,
      githubRepoName: null,
      color: 'amber',
    });
  });
});

describe('timeline and schedule events', () => {
  // feliz
  it('names the system of a timeline event and defaults the co-authors to an empty list', () => {
    const row = {
      id: 1,
      projectId: 2,
      type: 'pr',
      externalId: '#7',
      title: 'PR',
      description: null,
      url: null,
      author: 'dev',
      authorName: 'Dev',
      coAuthors: null,
      status: 'open',
      eventDate: NOW,
      createdAt: NOW,
      createdBy: 'sistema@azuos.local',
    } as unknown as SoftwareTimelineEventRow;

    expect(toSoftwareTimelineEvent(row, 'Chamados')).toMatchObject({
      projectName: 'Chamados',
      coAuthors: [],
      eventDate: NOW.toISOString(),
    });
    expect(toSoftwareTimelineEvent({ ...row, coAuthors: ['Bia'] }).projectName).toBeNull();
  });

  it('maps a schedule event with and without a system', () => {
    const row = {
      id: 1,
      projectId: null,
      kind: 'record',
      title: 'Incidente',
      category: 'other',
      color: 'red',
      date: '2026-10-20',
      startTime: '09:00',
      endTime: null,
      note: null,
      createdAt: NOW,
      createdBy: 'dora@empresa.com.br',
      createdById: null,
      createdByName: null,
      updatedAt: null,
      updatedBy: null,
    } as unknown as SoftwareScheduleEventRow;

    const event = toSoftwareScheduleEvent(row);
    expect(event).toMatchObject({ projectId: null, kind: 'record', endTime: null });
    expect(event.createdByEmail).toBe('dora@empresa.com.br');

    expect(toSoftwareScheduleEvent({ ...row, projectId: 3 }, 'Chamados').projectName).toBe(
      'Chamados',
    );
  });
});
