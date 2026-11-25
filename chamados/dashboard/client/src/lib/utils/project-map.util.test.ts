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

const commit = (sha: string, parents: string[], message: string, day: string) => ({
  sha,
  parents,
  message,
  authorLogin: 'vini',
  authorName: 'Vinícius Gabriel',
  committedAt: `2026-11-${day}T10:00:00.000Z`,
});

const ENTRY: ProjectMapEntry = {
  commits: [
    commit('pr13', ['fix31', 'feat'], 'Merge pull request #13 from grupo-azuos/feature/tela', '21'),
    commit('feat', ['fix31'], '[feat](web): Tela', '20'),
    commit('fix31', ['base'], '[merge](web): Corrige o CH-0031', '19'),
    commit('base', [], '[feat](web): Início', '18'),
  ],
  branches: [],
  tags: [{ name: 'v1.0.0', sha: 'base' }],
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
  it('draws the git graph as the axis, hangs each item on the commit where it closed, and the chains', () => {
    const map = buildProjectMap(
      [ENTRY],
      PROJECT_MAP_KINDS,
      {},
      {},
      new Date('2026-11-22T12:00:00Z'),
    );
    const has = (source: string, target: string) =>
      map.edges.some((edge) => edge.source === source && edge.target === target);
    const fromGit = (target: string) =>
      map.edges.find((edge) => edge.source === '1/git' && edge.target === target)?.sourceHandle;

    /* O PR #13 é citado no merge "Merge pull request #13": sai da linha dele. */
    expect(fromGit('1/event:11')).toBe('row:pr13');
    /* A issue #12 aberta, sem commit que a cite, sai do topo (o commit mais novo). */
    expect(fromGit('1/event:10')).toBe('row:pr13');
    /* O chamado sem issue fechou e é citado como CH-0031 no merge da correção. */
    expect(fromGit('1/ticket:31')).toBe('row:fix31');
    expect(has('1/event:10', '1/ticket:30')).toBe(true);
    expect(has('1/ticket:30', '1/task:40')).toBe(true);
    expect(has('1/event:11', '1/event:10')).toBe(true);
    expect(has('1/ticket:31', '1/task:41')).toBe(true);
    expect(map.edges.find((edge) => edge.target === '1/ticket:30')!.animated).toBe(true);
    expect(map.nodes.find((node) => node.type === 'git')!.data).toMatchObject({
      anchors: ['pr13', 'fix31'],
    });
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
  it('without commits, everything hangs on the top and the graph says to synchronize', () => {
    const map = buildProjectMap(
      [{ ...ENTRY, commits: [], branches: [], tags: [] }],
      PROJECT_MAP_KINDS,
    );
    const git = map.nodes.find((node) => node.type === 'git');

    expect(git?.data).toMatchObject({ rows: [], total: 0, anchors: ['top'] });
    expect(
      map.edges
        .filter((edge) => edge.source === '1/git')
        .every((edge) => edge.sourceHandle === 'row:top'),
    ).toBe(true);
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
