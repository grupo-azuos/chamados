import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
import TaskDetailDialog, { linkHref } from './azuos-task-detail-dialog.svelte';

function setup(task = taskFixture()) {
  const actions = {
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onToggleStep: vi.fn(),
    onRemoveLink: vi.fn(),
    onRemove: vi.fn(),
  };
  render(TaskDetailDialog, {
    props: { data: { task, now: TEST_NOW }, state: { isOpen: true }, actions },
  });
  return actions;
}

describe('AzuosTaskDetailDialog', () => {
  // feliz
  it('checks a step, finishes and links to the screen of what is linked', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Instalar' }));
    expect(actions.onToggleStep).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 12, true);
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(actions.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'done');
    expect(screen.getByRole('link', { name: 'Computador 02' })).toHaveAttribute(
      'href',
      '/infra/computers/3',
    );
  });

  // triste
  it('sends a ticket task to its ticket instead of finishing, and does not offer to delete it', () => {
    setup(taskFixture({ origin: 'ticket', ticketId: 56 }));

    expect(screen.queryByRole('button', { name: 'Finalizar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir o chamado' })).toHaveAttribute(
      'href',
      '/infra/tickets/56',
    );
    expect(linkHref('part', 4)).toBeNull();
  });
});
