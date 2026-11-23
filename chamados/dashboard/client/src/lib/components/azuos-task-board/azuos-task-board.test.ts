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
  icon: 'hourglass',
  position: 0,
  archivedAt: null,
};

function setup(canManage = true) {
  const actions = {
    onOpen: vi.fn(),
    onMove: vi.fn(),
    onStage: vi.fn(),
    onRefuse: vi.fn(),
    onNewStage: vi.fn(),
    onEditStage: vi.fn(),
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
            stage: { id: 4, label: 'Aguardando peça', color: '#ff9500', icon: 'hourglass' },
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
  it('draws the stages of the team between Reaberta and Finalizada, with "Nova situação" and the pencil', async () => {
    const actions = setup();

    /* Cada coluna é uma região com o nome dela, na ordem do quadro. */
    const titles = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'))
      .filter((label) => label !== 'Quadro das tarefas');
    expect(titles).toEqual(['Aberta', 'Reaberta', 'Aguardando peça', 'Finalizada']);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir a tarefa Na própria' }));
    expect(actions.onOpen).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Nova situação' }));
    expect(actions.onNewStage).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Aguardando peça' }));
    expect(actions.onEditStage).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
  });

  // triste
  it('hides "Nova situação" and the pencil from who cannot manage, and an empty column asks to drag', () => {
    setup(false);

    expect(screen.queryByRole('button', { name: 'Nova situação' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar Aguardando peça' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Arraste para cá.')).toHaveLength(1);
  });
});
