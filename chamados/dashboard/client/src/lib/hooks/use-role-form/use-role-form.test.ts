import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-role-form-harness.test.svelte';
import { type RoleFormModel } from './use-role-form.svelte';

vi.mock('$lib/api/roles.api', () => ({
  rolesApi: { assignMany: vi.fn(), listUsers: vi.fn().mockResolvedValue([]) },
}));

const { rolesApi } = await import('$lib/api/roles.api');

const ROLE: InternalRole = {
  id: 1,
  userId: 'usr_1',
  userEmail: 'ana@empresa.com.br',
  context: 'manutencao',
  createdAt: '2026-10-01T12:00:00.000Z',
  createdBy: 'admin@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

function mountModel(role: InternalRole | null = null, onSaved = vi.fn()): RoleFormModel {
  let model!: RoleFormModel;
  render(Harness, {
    props: {
      role,
      onSaved,
      onReady: (ready: RoleFormModel) => (model = ready),
    },
  });

  return model;
}

describe('useRoleFormModel', () => {
  beforeEach(() => {
    vi.mocked(rolesApi.assignMany).mockReset().mockResolvedValue([ROLE]);
  });

  // feliz
  it('starts in create mode with empty fields', () => {
    const model = mountModel(null);

    expect(model.data.mode).toBe('create');
    expect(model.data.fields.userId.value).toBe('');
    expect(model.data.contexts).toEqual([]);
  });

  it('selects and clears user with dedicated actions', () => {
    const model = mountModel(null);

    model.actions.onSelectUser({
      id: 'usr_sel',
      name: 'Pessoa Selecionada',
      email: 'sel@empresa.com.br',
    });

    expect(model.data.fields.userId.value).toBe('usr_sel');
    expect(model.data.fields.userEmail.value).toBe('sel@empresa.com.br');

    model.actions.onClearUser();
    expect(model.data.fields.userId.value).toBe('');
    expect(model.data.fields.userEmail.value).toBe('');
  });

  it('starts in edit mode populated with role data', () => {
    const model = mountModel(ROLE);

    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.userId.value).toBe('usr_1');
    expect(model.data.fields.userEmail.value).toBe('ana@empresa.com.br');
    expect(model.data.contexts).toEqual(['manutencao']);
  });

  it('submits valid assignment data and calls onSaved', async () => {
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onChange('userId', 'usr_novo');
    model.actions.onChange('userEmail', 'novo@empresa.com.br');
    model.actions.onContextsChange(['infra', 'sistema']);

    model.actions.onSubmit();

    await waitFor(() => {
      expect(rolesApi.assignMany).toHaveBeenCalledWith({
        userId: 'usr_novo',
        userEmail: 'novo@empresa.com.br',
        contexts: ['infra', 'sistema'],
      });
      expect(onSaved).toHaveBeenCalled();
    });
  });

  // triste
  it('rejects a submission without selected modules', async () => {
    const model = mountModel(null);
    model.actions.onSelectUser({ id: 'usr_novo', name: 'Pessoa Nova', email: 'novo@empresa.com.br' });
    model.actions.onSubmit();

    await waitFor(() => {
      expect(model.data.contextsError).toBe('Selecione pelo menos um módulo');
      expect(rolesApi.assignMany).not.toHaveBeenCalled();
    });
  });

  it('keeps all selections and stays open after a failed save', async () => {
    vi.mocked(rolesApi.assignMany).mockRejectedValue(new Error('Network failed'));
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);
    model.actions.onSelectUser({ id: 'usr_novo', name: 'Pessoa Nova', email: 'novo@empresa.com.br' });
    model.actions.onContextsChange(['infra', 'sistema', 'manutencao']);
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBeTruthy());
    expect(model.data.contexts).toEqual(['infra', 'sistema', 'manutencao']);
    expect(model.data.fields.userId.value).toBe('usr_novo');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows error on empty userId submit', async () => {
    const model = mountModel(null);

    model.actions.onSubmit();

    await waitFor(() => {
      expect(model.data.fields.userId.error).toBeTruthy();
      expect(rolesApi.assignMany).not.toHaveBeenCalled();
    });
  });
});
