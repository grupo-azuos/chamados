import {
  ticketHistoryEffect,
  ticketHistoryEffectLabel,
  ticketHistoryTone,
  ticketHistoryTypeLabel,
  type ManualTicketHistoryType,
} from '@template/shared/domain/ticket-history.util';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketMoveDialog, { type AzuosTicketMoveDialogProps } from './azuos-ticket-move-dialog.svelte';

/* Cada coluna é um estágio: soltar em "Resolvido" abre o formulário só com a Solução. */
const CLOSING: ManualTicketHistoryType[] = ['resolution'];

function formData(): AzuosTicketMoveDialogProps['data']['form'] {
  return {
    type: 'resolution',
    groups: {
      continuing: [],
      closing: CLOSING.map((type) => ({ value: type, label: ticketHistoryTypeLabel(type), tone: ticketHistoryTone(type) })),
    },
    effect: ticketHistoryEffect('resolution'),
    effectLabel: ticketHistoryEffectLabel('resolution'),
    fields: { description: { value: '', error: null }, minutesSpent: { value: '', error: null } },
    isVisibleToRequester: true,
    chosenFiles: [],
    notifyUserIds: [],
    notifiable: [],
  };
}

function renderDialog(state: Partial<AzuosTicketMoveDialogProps['state']> = {}) {
  const actions = {
    onCancel: vi.fn(),
    form: {
      onTypeChange: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      onVisibilityChange: vi.fn(),
      onNotifyChange: vi.fn(),
      onChosenFilesChange: vi.fn(),
      onAttachmentError: vi.fn(),
      onSubmit: vi.fn(),
    },
  };
  render(TicketMoveDialog, {
    props: {
      data: { protocol: 'CH-0010', targetTitle: 'Resolvido', form: formData() },
      state: { isOpen: true, ...state },
      actions,
    },
  });

  return actions;
}

describe('AzuosTicketMoveDialog', () => {
  // feliz
  it('asks for the history of the move, already on the one type that leads to the stage', async () => {
    const actions = renderDialog();

    expect(await screen.findByRole('heading', { name: 'Mover CH-0010 para "Resolvido"' })).toBeInTheDocument();
    expect(screen.getByText('Solução')).toBeInTheDocument();
    expect(screen.queryByText('Andamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelamento')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Encerrar chamado' }));
    expect(actions.form.onSubmit).toHaveBeenCalled();
  });

  it('gives the card back when the person cancels', async () => {
    const actions = renderDialog();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(actions.onCancel).toHaveBeenCalled();
  });

  // triste
  /* A requisição já saiu: fechar esconderia o resultado. */
  it('does not close while the history is being recorded', async () => {
    const actions = renderDialog({ form: { isSubmitting: true } });

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await userEvent.keyboard('{Escape}');

    expect(actions.onCancel).not.toHaveBeenCalled();
  });

  it('shows the refusal of the server inside the dialog, which stays open', async () => {
    renderDialog({ form: { error: 'Só quem administra alguma área deste chamado pode encerrá-lo.' } });

    expect(await screen.findByText(/pode encerrá-lo/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
