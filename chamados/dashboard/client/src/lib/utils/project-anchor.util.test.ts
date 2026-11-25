import { describe, expect, it } from 'vitest';

import { ANCHOR_TOP, anchorOf } from './project-anchor.util';

const commit = (sha: string, message: string, day: string) => ({
  sha,
  parents: [],
  message,
  authorLogin: 'vini',
  authorName: 'Vinícius',
  committedAt: `2026-11-${day}T10:00:00.000Z`,
});

/* Do mais novo para o mais velho, como o grafo desenha. */
const COMMITS = [
  commit('rel', '[merge](web): Release 1.4', '22'),
  commit('m13', 'Merge pull request #13 from grupo-azuos/feature/tela', '21'),
  commit('f13', '[feat](web): Tela (#13)', '20'),
  commit('m40', '[merge](web): Chamado CH-0040 resolvido', '19'),
  commit('old', '[feat](web): Início', '10'),
];
const TAGS = [{ name: 'v1.4.0', sha: 'rel' }];

describe('anchorOf', () => {
  // feliz
  it('hangs a PR or issue on the newest commit that cites it, and a ticket by its protocol', () => {
    expect(anchorOf({ numbers: [13], protocols: [], closedAt: null }, COMMITS, TAGS)).toBe('m13');
    expect(anchorOf({ numbers: [], protocols: [40], closedAt: null }, COMMITS, TAGS)).toBe('m40');
  });

  // feliz
  it('without a citing commit, what closed goes to the first version after it', () => {
    expect(
      anchorOf(
        { numbers: [99], protocols: [], closedAt: '2026-11-21T00:00:00.000Z' },
        COMMITS,
        TAGS,
      ),
    ).toBe('rel');
  });

  // triste
  it('what is still open, or closed after the last version, stays on top; #130 is not #13', () => {
    expect(anchorOf({ numbers: [99], protocols: [], closedAt: null }, COMMITS, TAGS)).toBe(
      ANCHOR_TOP,
    );
    expect(
      anchorOf(
        { numbers: [99], protocols: [], closedAt: '2026-11-23T00:00:00.000Z' },
        COMMITS,
        TAGS,
      ),
    ).toBe(ANCHOR_TOP);
    expect(anchorOf({ numbers: [1], protocols: [4], closedAt: null }, COMMITS, TAGS)).toBe(
      ANCHOR_TOP,
    );
  });
});
