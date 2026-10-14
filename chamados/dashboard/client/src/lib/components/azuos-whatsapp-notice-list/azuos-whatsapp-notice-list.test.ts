import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WhatsappNoticeList, { noticeDetailOf } from './azuos-whatsapp-notice-list.svelte';

function notice(over: Partial<WhatsappNotice> = {}): WhatsappNotice {
  return {
    id: 1,
    kind: 'ticket_ready',
    status: 'failed',
    attempts: 9,
    failureReason: 'not_connected',
    createdAt: '2026-10-14T12:00:00.000Z',
    sentAt: null,
    ...over,
  };
}

describe('AzuosWhatsappNoticeList', () => {
  // feliz
  it('shows each notice with its status and why it did not go out', () => {
    render(WhatsappNoticeList, { data: { notices: [notice()] } });

    expect(screen.getByText('Chamado pronto')).toBeInTheDocument();
    expect(screen.getByText('Não saiu')).toBeInTheDocument();
    expect(screen.getByText('O WhatsApp de quem envia está desconectado.')).toBeInTheDocument();
  });

  it('retries a stopped notice', async () => {
    const onRetry = vi.fn();
    render(WhatsappNoticeList, { data: { notices: [notice()] }, actions: { onRetry } });

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar' }));

    expect(onRetry).toHaveBeenCalledWith(notice());
  });

  // triste
  /* Na fila ele já vai sair; enviado já saiu — reenviar seria a mesma mensagem duas vezes. */
  it('offers no retry for a queued or sent notice', () => {
    render(WhatsappNoticeList, {
      data: {
        notices: [
          notice({ id: 1, status: 'pending', failureReason: null }),
          notice({
            id: 2,
            status: 'sent',
            failureReason: null,
            sentAt: '2026-10-14T12:00:05.000Z',
          }),
        ],
      },
      actions: { onRetry: vi.fn() },
    });

    expect(screen.queryByRole('button', { name: 'Reenviar' })).not.toBeInTheDocument();
  });

  it('draws nothing for a ticket without notices', () => {
    render(WhatsappNoticeList, { data: { notices: [] } });

    expect(screen.queryByText('Avisos por WhatsApp')).not.toBeInTheDocument();
  });

  it('shows why the retry was refused', () => {
    render(WhatsappNoticeList, {
      data: { notices: [notice()] },
      state: { error: 'Este aviso não pode ser reenviado.' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Este aviso não pode ser reenviado.');
  });
});

describe('noticeDetailOf', () => {
  // feliz
  it('says a queued notice is about to go out', () => {
    expect(noticeDetailOf(notice({ status: 'pending', failureReason: null }))).toBe(
      'Sai em instantes.',
    );
  });

  // triste
  it('says a queued notice is being retried, with the last failure', () => {
    expect(noticeDetailOf(notice({ status: 'pending', failureReason: 'failed' }))).toBe(
      'Tentando de novo. Última falha: Não consegui falar com o serviço de WhatsApp.',
    );
  });
});
