import { render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-github-connection-harness.test.svelte';
import { type useGithubConnectionModel } from './use-github-connection.svelte';

vi.mock('$lib/api/github-integration.api', () => ({
  githubIntegrationApi: { status: vi.fn(), authorize: vi.fn() },
}));

const { githubIntegrationApi } = await import('$lib/api/github-integration.api');
const { goto } = await import('$app/navigation');
const { page } = await import('$app/state');

type Model = ReturnType<typeof useGithubConnectionModel>;

function mountModel(enabled = true): Model {
  let model!: Model;
  render(Harness, { props: { enabled, onReady: (ready: Model) => (model = ready) } });

  return model;
}

describe('useGithubConnectionModel', () => {
  beforeEach(() => {
    vi.mocked(githubIntegrationApi.status).mockReset().mockResolvedValue({ isLinked: true, isConfigured: true } as never);
    vi.mocked(githubIntegrationApi.authorize).mockReset();
    vi.mocked(goto).mockClear();
  });

  afterEach(() => {
    page.url = new URL('http://localhost:5173/');
  });

  // feliz
  it('says whether the account is linked and configured', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.state.isLoading).toBe(false));
    expect(model.state.isLinked).toBe(true);
    expect(model.state.isConfigured).toBe(true);
  });

  // feliz
  it('sends the person to GitHub once, and comes back to the profile', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    let finish!: () => void;
    vi.mocked(githubIntegrationApi.authorize).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ url: 'https://github.com/login/oauth' } as never);
      }),
    );
    try {
      const model = mountModel();
      await waitFor(() => expect(model.state.isLoading).toBe(false));

      model.actions.onConnect();
      await waitFor(() => expect(githubIntegrationApi.authorize).toHaveBeenCalledTimes(1));
      /* Enquanto a primeira autorização está a caminho, um segundo clique não pede outra. */
      model.actions.onConnect();
      expect(githubIntegrationApi.authorize).toHaveBeenCalledTimes(1);
      finish();
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://github.com/login/oauth'));

      model.actions.onLeave();
      expect(goto).toHaveBeenCalledWith('/profile');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // triste
  it('explains a cancelled or failed authorization that came back in the address', async () => {
    page.url = new URL('http://localhost:5173/system?github_error=cancelled');
    let model = mountModel();
    expect(model.state.error).toMatch(/cancelada/);

    page.url = new URL('http://localhost:5173/system?github_error=denied');
    model = mountModel();
    expect(model.state.error).toMatch(/Não foi possível concluir/);
  });

  // triste
  it('does not call the account linked when the status failed, and asks again on retry', async () => {
    vi.mocked(githubIntegrationApi.status).mockRejectedValue(new ApiError(503, 'Fora do ar.'));
    const model = mountModel();

    await waitFor(() => expect(model.state.isLoading).toBe(false));
    expect(model.state.isLinked).toBe(false);
    vi.mocked(githubIntegrationApi.status).mockClear();
    model.actions.onRetry();
    await waitFor(() => expect(githubIntegrationApi.status).toHaveBeenCalled());
  });
});
