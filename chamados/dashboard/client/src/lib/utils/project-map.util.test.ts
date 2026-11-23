import { describe, expect, it } from 'vitest';

import { type ProjectMapEntry } from '@template/shared/schemas/project-map.schema';

import {
  buildProjectMap,
  issueRefsOf,
  PROJECT_MAP_KINDS,
  projectIdOfIsland,
} from './project-map.util';

const event = (
  id: number,
  type: 'pr' | 'issue' | 'merge',
  externalId: string,
  title: string,
  status: 'open' | 'merged' | 'closed',
) => ({
  id,
  type,
  externalId,
  title,
  status,
  url: `https://github.com/org/x/${id}`,
  author: 'vini',
  eventDate: '2026-11-20T10:00:00.000Z',
});

const ENTRY: ProjectMapEntry = {
  project: { id: 1, name: 'Paralegal', repositoryUrl: 'org/paralegal', status: 'active' },
  events: [
    event(10, 'issue', '#12', 'Tela não abre', 'open'),
    event(11, 'pr', '#13', 'Corrige a tela (#12)', 'merged'),
    event(12, 'merge', 'a1b2c3d', '[merge](web): Tela', 'merged'),
  ],
  hiddenEvents: 4,
  tickets: [
    {
      id: 30,
      status: 'open',
      isClosed: false,
      description: 'A tela não abre',
      githubIssueNumber: 12,
    },
    {
      id: 31,
      status: 'resolved',
      isClosed: true,
      description: 'Sem issue',
      githubIssueNumber: null,
    },
  ],
  tasks: [
    { id: 40, title: 'A tela não abre', status: 'open', ticketId: 30 },
    { id: 41, title: 'Sem issue', status: 'done', ticketId: 31 },
  ],
};

describe('project map', () => {
  // feliz
  it('draws the project, its groups, the issue → ticket → task chain and the PR that cites the issue', () => {
    const map = buildProjectMap([ENTRY], PROJECT_MAP_KINDS);
    const has = (source: string, target: string) =>
      map.edges.some((edge) => edge.source === source && edge.target === target);

    expect(map.nodes.filter((node) => node.type === 'hub').map((node) => node.data)).toEqual([
      { label: 'Issues', count: 1 },
      { label: 'Pull requests', count: 1 },
      { label: 'Merges e versões', count: 1 },
      { label: 'Chamados sem issue', count: 1 },
    ]);
    expect(has('1/event:10', '1/ticket:30')).toBe(true);
    expect(has('1/ticket:30', '1/task:40')).toBe(true);
    expect(has('1/event:11', '1/event:10')).toBe(true);
    expect(has('1/ticket:31', '1/task:41')).toBe(true);
    expect(map.edges.find((edge) => edge.target === '1/ticket:30')!.animated).toBe(true);
    expect(map.nodes.find((node) => node.type === 'project')!.data).toMatchObject({ hidden: 4 });
  });

  // feliz
  it('keeps an island where it was left and spreads the others in two columns', () => {
    const map = buildProjectMap(
      [
        ENTRY,
        { ...ENTRY, project: { ...ENTRY.project, id: 2 } },
        { ...ENTRY, project: { ...ENTRY.project, id: 3 } },
      ],
      PROJECT_MAP_KINDS,
      { '1': { x: 5, y: 6 } },
    );
    const islands = map.nodes.filter((node) => node.type === 'island');

    expect(islands[0]!.position).toEqual({ x: 5, y: 6 });
    expect(islands[1]!.position.x).not.toBe(islands[2]!.position.x);
    expect(projectIdOfIsland(islands[1]!.id)).toBe('2');
  });

  // triste
  it('leaves out the kinds hidden in "Mostrar", and a title without "#" cites no issue', () => {
    const map = buildProjectMap([ENTRY], ['prs']);

    expect(map.nodes.filter((node) => node.type === 'item')).toHaveLength(1);
    expect(issueRefsOf('Sem referência')).toEqual([]);
    expect(issueRefsOf('fixes #3 e #4')).toEqual([3, 4]);
    expect(projectIdOfIsland('1/project')).toBeNull();
  });
});
