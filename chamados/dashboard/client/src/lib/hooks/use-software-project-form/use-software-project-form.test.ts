import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { describe, expect, it } from 'vitest';

import { responsibleOptionsFor } from './use-software-project-form.svelte';

/* Dado INVENTADO: nenhum nome daqui existe. */
const attendants = [
  { id: 'u-ana', name: 'Ana Lima' },
  { id: 'u-bia', name: 'Bia Costa' },
];

function project(over: Partial<SoftwareProject> = {}): SoftwareProject {
  return {
    id: 1,
    name: 'Portal do Cliente',
    description: null,
    repositoryUrl: 'org/portal',
    status: 'active',
    color: 'blue',
    githubRepoOwner: 'org',
    githubRepoName: 'portal',
    responsibleId: null,
    responsibleName: null,
    openTicketsCount: 0,
    pullRequestsCount: 0,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: null,
    ...over,
  };
}

describe('responsibleOptionsFor', () => {
  // feliz
  it('offers who attends Sistema, with "no responsible" first', () => {
    expect(responsibleOptionsFor(attendants, null)).toEqual([
      { value: '', label: 'Sem responsável' },
      { value: 'u-ana', label: 'Ana Lima' },
      { value: 'u-bia', label: 'Bia Costa' },
    ]);
  });

  // triste
  /* Quem deixou de atender Sistema continua aparecendo como o responsável atual do projeto. */
  it('keeps the current responsible even when they no longer attend Sistema', () => {
    const options = responsibleOptionsFor(
      attendants,
      project({ responsibleId: 'u-caio', responsibleName: 'Caio Reis' }),
    );

    expect(options.at(-1)).toEqual({ value: 'u-caio', label: 'Caio Reis' });
  });

  it('offers only "no responsible" while nobody attends Sistema', () => {
    expect(responsibleOptionsFor([], project())).toEqual([{ value: '', label: 'Sem responsável' }]);
  });
});
