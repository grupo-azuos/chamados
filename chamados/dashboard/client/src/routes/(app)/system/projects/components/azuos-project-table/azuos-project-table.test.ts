import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectTable, { projectStatusTone, repositoryHrefOf, repositoryLabelOf } from './azuos-project-table.svelte';

const project: SoftwareProject = {
  id: 1,
  name: 'Portal do Cliente',
  description: null,
  repositoryUrl: 'exemplo/portal',
  githubRepoOwner: null,
  githubRepoName: null,
  responsibleId: 'person-ana',
  responsibleName: 'Ana Lima',
  status: 'maintenance',
  color: 'blue',
  openTicketsCount: 2,
  pullRequestsCount: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  archive: null,
};

function setup(items: SoftwareProject[] = [project], menuItems = [{ id: 'edit', label: 'Editar' }]) {
  const actions = { onOpen: vi.fn(), onMenuSelect: vi.fn() };
  render(ProjectTable, { props: { data: { items, menuItems }, actions } });

  return actions;
}

describe('AzuosProjectTable', () => {
  // feliz
  it('lists each system with its repository, counts and owner, opens it and runs the menu', async () => {
    const actions = setup();

    expect(screen.getByRole('link', { name: 'exemplo/portal' })).toHaveAttribute('href', 'https://github.com/exemplo/portal');
    expect(screen.getByText('Manutenção')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver sistema Portal do Cliente' }));
    expect(actions.onOpen).toHaveBeenCalledWith(project);
    await userEvent.click(screen.getByRole('button', { name: 'Ações de Portal do Cliente' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(actions.onMenuSelect).toHaveBeenCalledWith('edit', project);
  });

  // triste
  it('says when nobody answers for the system and hides an empty menu', () => {
    setup([{ ...project, responsibleId: null, responsibleName: null }], []);

    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Ações de/ })).not.toBeInTheDocument();
  });

  // feliz
  it('names the repository from GitHub and keeps a full address as the link', () => {
    const fromGithub = { ...project, githubRepoOwner: 'exemplo', githubRepoName: 'portal-web', repositoryUrl: 'https://github.com/exemplo/portal-web' };

    expect(repositoryLabelOf(fromGithub)).toBe('exemplo/portal-web');
    expect(repositoryHrefOf(fromGithub)).toBe('https://github.com/exemplo/portal-web');
    expect(projectStatusTone(project)).toBe('warning');
  });

  // triste
  it('falls back to the neutral tone for an unknown situation', () => {
    expect(projectStatusTone({ ...project, status: 'whatever' as never })).toBe('neutral');
  });
});
