import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { taskFixture } from '$lib/utils/task-fixture.test-support';
import TaskBoard from './azuos-task-board.svelte';

const STAGE = {
  id: 4,
  area: 'infra' as const,
  label: 'Aguardando peça',
  color: '#ff9500',
  position: 0,
};

function setup(canManage = true) {
  const actions = {
    onOpen: vi.fn(),
    onMove: vi.fn(),
    onStage: vi.fn(),
    onRefuse: vi.fn(),
    onManageStages: vi.fn(),
  };
  render(TaskBoard, {
    props: {
      data: {
        tasks: [
          taskFixture(),
          taskFixture({ id: 2, status: 'done' }),
          taskFixture({
            id: 3,
            title: 'Na própria',
            stage: { id: 4, label: 'Aguardando peça', color: '#ff9500' },
          }),
        ],
        stages: [STAGE],
      },
      ui: { canManageStages: canManage },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskBoard', () => {
  // feliz
  it('draws the stages of the team between Reaberta and Finalizada, with the task in its stage', async () => {
    const actions = setup();

    /* Cada coluna é uma região com o nome dela, na ordem do quadro. */
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'))
      .filter((label) => label !== 'Quadro das tarefas');
    expect(titles).toEqual(['Aberta', 'Reaberta', 'Aguardando peça', 'Finalizada']);
    expect(screen.getByRole('button', { name: 'Abrir a tarefa Na própria' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Situações' }));
    expect(actions.onManageStages).toHaveBeenCalled();
  });

  // triste
  it('hides "Situações" from who cannot manage, and an empty column asks to drag', () => {
    setup(false);

    expect(screen.queryByRole('button', { name: 'Situações' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Arraste para cá.')).toHaveLength(1);
  });
});
