import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
import { mapPeopleOf } from '$lib/utils/task-map.util';

import TaskMap from './azuos-task-map.svelte';

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
  over: {
    peopleIds?: string[];
    positions?: Record<string, { x: number; y: number }>;
    kinds?: readonly ('ticket' | 'computer' | 'part' | 'inventory_item')[];
  } = {},
) {
  const actions = { onPeopleChange: vi.fn(), onIslandMove: vi.fn(), onResetLayout: vi.fn() };
  const tasks = [
    taskFixture({
      id: 1,
      links: [
        { id: 1, kind: 'computer', targetId: 3, label: 'Computador 03', source: 'task' as const },
      ],
    }),
    taskFixture({
      id: 2,
      title: 'De outra pessoa',
      owner: { id: 'bia', name: 'Bia', avatarUrl: null },
    }),
  ];
  render(TaskMap, {
    props: {
      data: {
        tasks,
        people: [],
        peopleIds: over.peopleIds ?? ['person-ana'],
        positions: over.positions ?? {},
        now: TEST_NOW,
        kinds: over.kinds,
      },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskMap', () => {
  // feliz
  it('shows only the islands of the chosen people, with "Mostrar" and the reset', async () => {
    const actions = setup({ positions: { '1': { x: 0, y: 0 } } });

    expect(screen.getByRole('group', { name: 'Mostrar no mapa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chamados' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Computadores' }));
    expect(screen.getByRole('button', { name: 'Computadores' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Arrumar de novo' }));
    expect(actions.onResetLayout).toHaveBeenCalled();
  });

  // triste
  it('says nothing is on the map when the chosen person has no task', () => {
    setup({ peopleIds: ['ninguem'] });

    expect(screen.getByText('Nenhuma tarefa no mapa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arrumar de novo' })).toBeDisabled();
  });

  // feliz
  it('offers the people of the tasks, even those without access', () => {
    const people = mapPeopleOf(
      [taskFixture({ owner: { id: 'bia', name: 'Bia', avatarUrl: null }, people: [] })],
      [{ id: 'ana', name: 'Ana', photo: null }],
    );

    expect(people.map((person) => person.name)).toEqual(['Ana', 'Bia']);
  });

  // triste
  it('in Sistema, "Mostrar" offers only tickets', () => {
    setup({ kinds: ['ticket'], positions: { '1': { x: 0, y: 0 } } });

    expect(screen.getByRole('button', { name: 'Chamados' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Computadores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inventário' })).not.toBeInTheDocument();
  });
});
