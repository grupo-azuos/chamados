import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import TicketReplyForm, { copyOf } from './azuos-ticket-reply-form.svelte';

const data = {
  type: 'requester_reply' as const,
  description: 'Segue o print.',
  chosenFiles: [],
  notifyIds: [],
  notifiable: [{ id: 'u-1', name: 'Ana Lima' }],
  watcherIds: [],
  peopleOptions: [{ id: 'u-1', name: 'Ana Lima' }],
};

function actions() {
  return {
    onDescriptionChange: vi.fn(),
    onChosenFilesChange: vi.fn(),
    onAttachmentError: vi.fn(),
    onNotifyChange: vi.fn(),
    onWatchersChange: vi.fn(),
    onSubmit: vi.fn(),
  };
}

describe('AzuosTicketReplyForm', () => {
  // feliz
  it('sends the reply from the button', async () => {
    const handlers = actions();
    render(TicketReplyForm, { data, state: {}, actions: handlers });

    await fireEvent.click(screen.getByRole('button', { name: 'Enviar retorno' }));

    expect(handlers.onSubmit).toHaveBeenCalled();
    expect(screen.getByText('Avisar por WhatsApp')).toBeTruthy();
  });

  // feliz
  it('becomes a reopening when the ticket is closed', () => {
    render(TicketReplyForm, { data: { ...data, type: 'requester_reopening' }, state: {}, actions: actions() });

    expect(screen.getByRole('button', { name: 'Reabrir chamado' })).toBeTruthy();
    expect(copyOf('requester_reopening').label).toBe('Por que reabrir');
  });

  // triste
  it('shows the field error and the send error', () => {
    render(TicketReplyForm, {
      data,
      state: { descriptionError: 'Descreva o que aconteceu', error: 'Não consegui enviar agora.' },
      actions: actions(),
    });

    expect(screen.getByText('Descreva o que aconteceu')).toBeTruthy();
    expect(screen.getByText('Não consegui enviar agora.')).toBeTruthy();
  });

  // triste
  it('hides the notify field when there is nobody to notify', () => {
    render(TicketReplyForm, { data: { ...data, notifiable: [] }, state: {}, actions: actions() });

    expect(screen.queryByText('Avisar por WhatsApp')).toBeNull();
  });
});
