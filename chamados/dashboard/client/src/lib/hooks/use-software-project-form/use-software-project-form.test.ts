import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-software-project-form-harness.test.svelte';
import {
  responsibleOptionsFor,
  type SoftwareProjectFormModel,
} from './use-software-project-form.svelte';

vi.mock('$lib/api/software-projects.api', () => ({
  softwareProjectsApi: { create: vi.fn(), update: vi.fn() },
}));

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { assigneeOptions: vi.fn() },
}));

const { softwareProjectsApi } = await import('$lib/api/software-projects.api');
const { ticketsApi } = await import('$lib/api/tickets.api');

function project(overrides: Partial<SoftwareProject> = {}): SoftwareProject {
  return {
    id: 1,
    name: 'Chamados',
    description: 'O sistema de chamados.',
    repositoryUrl: 'org/chamados',
    status: 'active',
    color: 'blue',
    githubRepoOwner: 'org',
    githubRepoName: 'chamados',
    responsibleId: 'u-dora',
    responsibleName: 'Dora',
    openTicketsCount: 0,
    pullRequestsCount: 0,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: null,
    ...overrides,
  };
}

function mountModel(
  props: { project?: SoftwareProject | null; onSaved?: () => void } = {},
): SoftwareProjectFormModel {
  let model!: SoftwareProjectFormModel;
  render(Harness, { props: { ...props, onReady: (ready: SoftwareProjectFormModel) => (model = ready) } });

  return model;
}

describe('useSoftwareProjectFormModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.assigneeOptions).mockResolvedValue([{ id: 'u-dora', name: 'Dora' }]);
    vi.mocked(softwareProjectsApi.create).mockResolvedValue(project());
    vi.mocked(softwareProjectsApi.update).mockResolvedValue(project());
  });

  // feliz
  it('registers the system with the fields trimmed and no responsible as null', async () => {
    const onSaved = vi.fn();
    const model = mountModel({ onSaved });
    expect(model.data.mode).toBe('create');
    expect(model.data.fields.status.value).toBe('active');

    model.actions.onChange('name', 'Paralegal');
    model.actions.onChange('description', '  Societário  ');
    model.actions.onChange('repositoryUrl', 'org/paralegal');
    model.actions.onChange('color', 'green');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(softwareProjectsApi.create).toHaveBeenCalledWith({
        name: 'Paralegal',
        description: 'Societário',
        repositoryUrl: 'org/paralegal',
        status: 'active',
        color: 'green',
        responsibleId: null,
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('edits the existing system, starting from what it has', async () => {
    const model = mountModel({ project: project() });
    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.responsibleId.value).toBe('u-dora');

    model.actions.onChange('responsibleId', '');
    model.actions.onChange('description', '');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(softwareProjectsApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: null, responsibleId: null }),
      ),
    );
  });

  it('offers who attends System as responsible, with the current one kept', async () => {
    const model = mountModel({ project: project({ responsibleId: 'u-saiu', responsibleName: 'Quem saiu' }) });

    await waitFor(() =>
      expect(model.data.responsibleOptions).toEqual([
        { value: '', label: 'Sem responsável' },
        { value: 'u-dora', label: 'Dora' },
        { value: 'u-saiu', label: 'Quem saiu' },
      ]),
    );
  });

  // triste
  it('shows the error of a required field after leaving it', async () => {
    const model = mountModel();

    model.actions.onBlur('name');

    await waitFor(() => expect(model.data.fields.name.error).toBe('Informe o nome do sistema'));
  });

  it('does not send an invalid form, and shows the error of the server', async () => {
    vi.mocked(softwareProjectsApi.create).mockRejectedValue(new ApiError(422, 'Repositório inválido.'));
    const model = mountModel();

    model.actions.onSubmit();
    await waitFor(() => expect(model.data.fields.repositoryUrl.error).toBeTruthy());
    expect(softwareProjectsApi.create).not.toHaveBeenCalled();

    model.actions.onChange('name', 'X');
    model.actions.onChange('repositoryUrl', 'org/x');
    model.actions.onSubmit();
    await waitFor(() => expect(model.state.error).toBe('Repositório inválido.'));
  });
});

describe('responsibleOptionsFor', () => {
  // feliz
  it('puts "no responsible" first and keeps a responsible who left the area', () => {
    expect(responsibleOptionsFor([{ id: 'a', name: 'Ana' }], null)).toEqual([
      { value: '', label: 'Sem responsável' },
      { value: 'a', label: 'Ana' },
    ]);
    expect(
      responsibleOptionsFor([], project({ responsibleId: 'z', responsibleName: null })),
    ).toEqual([
      { value: '', label: 'Sem responsável' },
      { value: 'z', label: 'Responsável atual' },
    ]);
  });
});
