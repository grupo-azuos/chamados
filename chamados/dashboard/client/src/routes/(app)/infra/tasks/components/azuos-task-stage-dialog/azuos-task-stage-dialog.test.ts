import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskStageDialog from './azuos-task-stage-dialog.svelte';

const STAGES = [
  { id: 4, area: 'infra' as const, label: 'Aguardando peça', color: '#ff9500', position: 0 },
  { id: 5, area: 'infra' as const, label: 'Com o fornecedor', color: '#5856d6', position: 1 },
];

function setup(error: string | null = null) {
  const actions = {
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onMove: vi.fn(),
    onArchive: vi.fn(),
    onClose: vi.fn(),
  };
  render(TaskStageDialog, {
    props: { data: { stages: STAGES }, state: { isOpen: true, error }, actions },
  });
  return actions;
}

describe('AzuosTaskStageDialog', () => {
  // feliz
  it('lists the columns in order, creates, moves, edits and archives a stage', async () => {
    const actions = setup();

    const order = screen.getByRole('list', { name: 'Ordem das colunas' });
    expect(order).toHaveTextContent(
      /Aberta.*Reaberta.*Aguardando peça.*Com o fornecedor.*Finalizada/,
    );
    await userEvent.type(screen.getByLabelText('Nova situação'), 'Na garantia');
    await userEvent.click(screen.getByRole('button', { name: 'Criar situação' }));
    expect(actions.onCreate).toHaveBeenCalledWith('Na garantia', expect.any(String));
    await userEvent.click(
      screen.getByRole('button', { name: 'Levar Com o fornecedor para a esquerda' }),
    );
    expect(actions.onMove).toHaveBeenCalledWith(5, -1);
    await userEvent.click(screen.getByRole('button', { name: 'Arquivar Aguardando peça' }));
    expect(actions.onArchive).toHaveBeenCalledWith(4);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Aguardando peça' }));
    const name = screen.getByLabelText('Nome da situação');
    await userEvent.clear(name);
    await userEvent.type(name, 'Esperando peça');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(actions.onUpdate).toHaveBeenCalledWith(4, { label: 'Esperando peça', color: '#ff9500' });
  });

  // triste
  it('does not create without a name, keeps the ends still, and shows the refusal', () => {
    setup('Já existe uma situação com esse nome.');

    expect(screen.getByRole('button', { name: 'Criar situação' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Levar Aguardando peça para a esquerda' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Levar Com o fornecedor para a direita' }),
    ).toBeDisabled();
    expect(screen.getByText('Já existe uma situação com esse nome.')).toBeInTheDocument();
  });
});
