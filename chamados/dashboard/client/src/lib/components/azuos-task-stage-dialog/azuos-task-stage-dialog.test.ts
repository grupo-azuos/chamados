import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskStageDialog, { stageFormOf } from './azuos-task-stage-dialog.svelte';

const stage = (id: number, label: string, position: number) => ({
  id,
  area: 'infra' as const,
  label,
  color: '#ff9500',
  icon: 'hourglass',
  position,
  archivedAt: null,
});
const STAGES = [stage(4, 'Aguardando peça', 0), stage(5, 'Com o fornecedor', 1)];

function setup(editing: (typeof STAGES)[number] | null, error: string | null = null) {
  const actions = {
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(true),
    onUpdate: vi.fn().mockResolvedValue(true),
    onMove: vi.fn(),
    onRemove: vi.fn().mockResolvedValue(true),
    onArchiveOpenChange: vi.fn(),
    onRestore: vi.fn(),
  };
  render(TaskStageDialog, {
    props: {
      data: {
        editing,
        stages: STAGES,
        archivedStages: [
          {
            key: '9',
            label: 'Na garantia',
            archivedAt: '2026-11-20T10:00:00.000Z',
            canRestore: true,
          },
        ],
      },
      state: {
        isOpen: true,
        isSaving: false,
        error,
        archive: { isLoading: false, restoringKey: null, error: null },
      },
      actions,
    },
  });
  return actions;
}

describe('AzuosTaskStageDialog', () => {
  // feliz
  it('creates a stage with name, color and icon, and offers the archived ones', async () => {
    const actions = setup(null);

    expect(screen.getByRole('heading', { name: 'Nova situação' })).toBeInTheDocument();
    expect(screen.getByText('Situações arquivadas')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Nome da situação/), 'Com o técnico');
    await userEvent.click(screen.getByRole('button', { name: 'Criar situação' }));

    expect(actions.onCreate).toHaveBeenCalledWith({
      label: 'Com o técnico',
      color: expect.any(String),
      icon: 'tag',
    });
    expect(actions.onClose).toHaveBeenCalled();
  });

  // feliz
  it('edits a stage: saves, moves it on the board and archives it after confirming', async () => {
    const actions = setup(STAGES[1]!);

    expect(screen.getByRole('heading', { name: 'Editar situação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mover para a direita' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mover para a esquerda' }));
    expect(actions.onMove).toHaveBeenCalledWith(5, -1);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(actions.onUpdate).toHaveBeenCalledWith(5, {
      label: 'Com o fornecedor',
      color: '#ff9500',
      icon: 'hourglass',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Arquivar situação' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Arquivar situação' }).at(-1)!);
    expect(actions.onRemove).toHaveBeenCalledWith(5);
  });

  // triste
  it('does not create without a name, and shows the refusal of the server', async () => {
    const actions = setup(null, 'Já existe uma situação com esse nome.');

    await userEvent.click(screen.getByRole('button', { name: 'Criar situação' }));

    expect(actions.onCreate).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o nome da situação.')).toBeInTheDocument();
    expect(stageFormOf(null, '#000000')).toEqual({ label: '', color: '#000000', icon: 'tag' });
  });
});
