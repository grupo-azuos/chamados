import { describe, expect, it } from 'vitest';

import { buildGitGraph, categoryOfBranch, categoryOfMessage, initialsOf } from './git-graph.util';

const commit = (
  sha: string,
  parents: string[],
  message: string,
  day = '2026-11-20',
  authorLogin = 'vini',
) => ({
  sha,
  parents,
  message,
  authorLogin,
  authorName: 'Vinícius Gabriel',
  committedAt: `${day}T10:00:00.000Z`,
});

/* develop: m2 ← m1 ← base; m2 junta f1 (feature), m1 junta x1 (fix). */
const COMMITS = [
  commit('m2', ['m1', 'f1'], '[merge](web): Mapa', '2026-11-22'),
  commit('f1', ['m1'], '[feat](web): Mapa', '2026-11-21', 'gui'),
  commit('m1', ['base', 'x1'], '[merge](web): Correção', '2026-11-20'),
  commit('x1', ['base'], '[fix](web): Correção', '2026-11-19'),
  commit('base', [], '[feat](web): Início', '2026-11-18'),
];

describe('git graph', () => {
  // feliz
  it('keeps develop in one lane and draws each merged branch beside it', () => {
    const rows = buildGitGraph(COMMITS, [
      { name: 'develop', headSha: 'm2', firstSeenAt: '2026-01-01T00:00:00.000Z', lastPushAt: null },
    ]);

    expect(rows.map((row) => [row.commit.sha, row.lane, row.isMerge])).toEqual([
      ['m2', 0, true],
      ['f1', 1, false],
      ['m1', 0, true],
      ['x1', 1, false],
      ['base', 0, false],
    ]);
    expect(rows[0]!.heads).toEqual([{ name: 'develop', category: 'develop', isNew: false }]);
    expect(rows[0]!.hue).toBe('blue');
    expect(rows[0]!.below.some((link) => link.from === 0 && link.to === 1)).toBe(true);
    expect(rows[1]!.hue).toBe('plum');
    expect(rows[3]!.hue).toBe('red');
  });

  // feliz
  it('"only merges and branches" links each merge to the nearest one left, and a new branch pulses', () => {
    const rows = buildGitGraph(
      COMMITS,
      [
        {
          name: 'feature/mapa',
          headSha: 'f1',
          firstSeenAt: '2026-11-22T00:00:00.000Z',
          lastPushAt: null,
        },
      ],
      { onlyMerges: true },
      new Date('2026-11-22T12:00:00.000Z'),
    );

    expect(rows.map((row) => row.commit.sha)).toEqual(['m2', 'f1', 'm1']);
    expect(rows[2]!.isMerge).toBe(true);
    expect(rows[1]!.heads[0]).toMatchObject({
      name: 'feature/mapa',
      category: 'feature',
      isNew: true,
    });
  });

  // triste
  it('the period and the person cut the rows, and a person without GitHub has none', () => {
    expect(
      buildGitGraph(COMMITS, [], { from: '2026-11-20', to: '2026-11-21' }).map(
        (row) => row.commit.sha,
      ),
    ).toEqual(['f1', 'm1']);
    expect(
      buildGitGraph(COMMITS, [], { isPersonFiltered: true, personLogin: 'GUI' }).map(
        (row) => row.commit.sha,
      ),
    ).toEqual(['f1']);
    expect(buildGitGraph(COMMITS, [], { isPersonFiltered: true, personLogin: null })).toEqual([]);
    expect(categoryOfBranch('hotfix/login')).toBe('hotfix');
    expect(categoryOfBranch('main')).toBe('main');
    expect(categoryOfBranch('wip')).toBe('other');
    expect(categoryOfMessage('fix: algo')).toBe('bugfix');
    expect(categoryOfMessage('qualquer')).toBe('other');
    expect(initialsOf('Vinícius Gabriel')).toBe('VG');
  });

  // feliz
  it('marks the version on its commit and keeps it in "only merges and branches"', () => {
    const rows = buildGitGraph(COMMITS, [], { onlyMerges: true }, new Date(), [
      { name: 'v1.0.0', sha: 'base' },
    ]);

    expect(rows.map((row) => row.commit.sha)).toEqual(['m2', 'm1', 'base']);
    expect(rows[2]!.tags).toEqual(['v1.0.0']);
  });
});
