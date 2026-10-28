import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-support-shell-harness.test.svelte';
import { type SupportShellModel } from './use-support-shell.svelte';

vi.mock('$lib/api/auth.api', () => ({ authApi: { logout: vi.fn() } }));
vi.mock('$lib/utils/leave-session.util', () => ({ leaveSession: vi.fn() }));

const { authApi } = await import('$lib/api/auth.api');
const { leaveSession } = await import('$lib/utils/leave-session.util');

function mountModel(): SupportShellModel {
  let model!: SupportShellModel;
  render(Harness, { props: { onReady: (ready: SupportShellModel) => (model = ready) } });

  return model;
}

describe('useSupportShellModel', () => {
  beforeEach(() => {
    vi.mocked(authApi.logout).mockReset();
    vi.mocked(leaveSession).mockReset();
  });

  // feliz
  it('sai da conta e deixa a Central', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const model = mountModel();

    model.actions.onSignOut();

    await waitFor(() => expect(leaveSession).toHaveBeenCalledOnce());
  });

  // feliz
  it('troca o tema entre claro e escuro', () => {
    const model = mountModel();
    const before = model.data.theme;

    model.actions.onToggleTheme();

    expect(model.data.theme).not.toBe(before);
    model.actions.onToggleTheme();
  });

  // triste
  it('continua na Central e mostra o motivo quando a saída falha', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new ApiError(500, 'Não foi possível sair.'));
    const model = mountModel();

    model.actions.onSignOut();

    await waitFor(() => expect(model.state.signOutError).toBe('Não foi possível sair.'));
    expect(leaveSession).not.toHaveBeenCalled();
  });
});
