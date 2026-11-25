import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TaskGit, { branchUrl } from './azuos-task-git.svelte';

const commit = {
  sha: 'a1b2c3d4e5',
  parents: [],
  message: '[feat](web): Tela de vendas',
  authorLogin: 'vini',
  authorName: 'Vinícius Gabriel',
  committedAt: '2026-11-20T10:00:00.000Z',
};
const branch = (name: string, isOfTask: boolean, firstSeenAt = '2026-01-01T00:00:00.000Z') => ({
  name,
  headSha: 'a1b2c3d4e5',
  firstSeenAt,
  lastPushAt: null,
  isOfTask,
});

describe('AzuosTaskGit', () => {
  // feliz
  it('lists the branches of the task opening on GitHub, and draws the commits', () => {
    render(TaskGit, {
      props: {
        data: {
          git: {
            project: { id: 1, name: 'Paralegal', repositoryUrl: 'grupo-azuos/paralegal' },
            commits: [commit],
            branches: [
              branch('feature/tarefa-42-tela', true, '2026-11-22T00:00:00.000Z'),
              branch('develop', false),
            ],
          },
          now: new Date('2026-11-22T12:00:00.000Z'),
        },
      },
    });

    const link = screen.getByRole('link', { name: /feature\/tarefa-42-tela/ });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/grupo-azuos/paralegal/tree/feature/tarefa-42-tela',
    );
    expect(link).toHaveAttribute('aria-label', 'Branch nova: feature/tarefa-42-tela');
    expect(screen.getByText('[feat](web): Tela de vendas')).toBeInTheDocument();
  });

  // triste
  it('says when there is no system or no branch of the task', () => {
    render(TaskGit, { props: { data: { git: { project: null, commits: [], branches: [] } } } });
    expect(screen.getByText('Sem sistema')).toBeInTheDocument();
    document.body.innerHTML = '';
    render(TaskGit, {
      props: {
        data: {
          git: {
            project: { id: 1, name: 'Paralegal', repositoryUrl: 'https://github.com/x/y/' },
            commits: [],
            branches: [],
          },
        },
      },
    });
    expect(screen.getByText(/Nenhuma branch leva no nome/)).toBeInTheDocument();
    expect(branchUrl('https://github.com/x/y/', 'develop')).toBe(
      'https://github.com/x/y/tree/develop',
    );
  });
});
