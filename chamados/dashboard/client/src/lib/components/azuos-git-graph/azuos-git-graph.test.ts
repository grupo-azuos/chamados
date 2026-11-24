import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { projectMapEntryFixture } from '$lib/utils/project-map.fixture.test-support';
import { buildGitGraph } from '$lib/utils/git-graph.util';
import GitGraph from './azuos-git-graph.svelte';

describe('AzuosGitGraph', () => {
  // feliz
  it('draws each commit with the short hash, the initials, the branch heads and the message', () => {
    const entry = projectMapEntryFixture();
    render(GitGraph, {
      props: {
        data: {
          rows: buildGitGraph(entry.commits, entry.branches, {}, new Date('2026-11-22T12:00:00Z')),
        },
      },
    });

    expect(screen.getByText('[merge](web): Tela')).toBeInTheDocument();
    expect(screen.getAllByText('VG')).toHaveLength(3);
    expect(screen.getByLabelText('Branch nova: feature/mapa')).toBeInTheDocument();
    expect(screen.getByText('develop')).toBeInTheDocument();
  });

  // triste
  it('says when there is no commit in the cut', () => {
    render(GitGraph, { props: { data: { rows: [] } } });
    expect(screen.getByText('Nenhum commit no recorte.')).toBeInTheDocument();
  });
});
