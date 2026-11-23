import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { projectMapEntryFixture } from '$lib/utils/project-map.fixture.test-support';
import ProjectMap from './azuos-project-map.svelte';

/* O Svelte Flow mede a área com `ResizeObserver`, que o jsdom não tem. */
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function setup(
  over: Partial<{
    entries: ReturnType<typeof projectMapEntryFixture>[];
    error: string | null;
  }> = {},
) {
  const actions = { onProjectsChange: vi.fn(), onIslandMove: vi.fn(), onResetLayout: vi.fn() };
  render(ProjectMap, {
    props: {
      data: {
        entries: over.entries ?? [projectMapEntryFixture()],
        projects: [{ id: 1, name: 'Paralegal' }],
        projectIds: [],
        positions: { '1': { x: 0, y: 0 } },
      },
      state: { error: over.error ?? null },
      actions,
    },
  });
  return actions;
}

describe('AzuosProjectMap', () => {
  // feliz
  it('offers the projects, the kinds to show and the reset', async () => {
    const actions = setup();

    expect(screen.getByRole('group', { name: 'Mostrar no mapa' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pull requests' }));
    expect(screen.getByRole('button', { name: 'Pull requests' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Arrumar de novo' }));
    expect(actions.onResetLayout).toHaveBeenCalled();
  });

  // triste
  it('says when there is no project and when the map failed', () => {
    setup({ entries: [] });
    expect(screen.getByText('Nenhum projeto no mapa')).toBeInTheDocument();
  });

  // triste
  it('shows the error of the map', () => {
    setup({ error: 'O mapa está fora do ar.' });
    expect(screen.getByText('O mapa está fora do ar.')).toBeInTheDocument();
  });
});
