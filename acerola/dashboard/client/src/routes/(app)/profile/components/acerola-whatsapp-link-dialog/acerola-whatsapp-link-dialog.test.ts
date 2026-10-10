import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WhatsappLinkDialog, {
  type AcerolaWhatsappLinkDialogProps,
  WHATSAPP_LINK_RISKS,
} from './acerola-whatsapp-link-dialog.svelte';

function renderDialog(
  state: Partial<AcerolaWhatsappLinkDialogProps['state']> = {},
  qrImage: string | null = null,
) {
  const actions = { onConfirm: vi.fn(), onClose: vi.fn() };

  render(WhatsappLinkDialog, {
    props: { data: { qrImage }, state: { step: 'risks', secondsLeft: 0, ...state }, actions },
  });

  return actions;
}

describe('AcerolaWhatsappLinkDialog', () => {
  // feliz
  it('lists every risk before the link', () => {
    renderDialog();

    for (const risk of WHATSAPP_LINK_RISKS) {
      expect(screen.getByText(risk)).toBeInTheDocument();
    }
  });

  it('confirms once the reading time is over', async () => {
    const actions = renderDialog({ secondsLeft: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Entendi os riscos, vincular' }));

    expect(actions.onConfirm).toHaveBeenCalledOnce();
  });

  it('shows the QR code and how to read it in the second step', () => {
    renderDialog({ step: 'qr' }, 'data:image/png;base64,AAAA');

    expect(screen.getByRole('img', { name: 'QR code para vincular o WhatsApp' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    );
    expect(screen.getByText(/Aparelhos conectados/)).toBeInTheDocument();
    expect(screen.queryByText(WHATSAPP_LINK_RISKS[0])).not.toBeInTheDocument();
  });

  it('closes from either step', async () => {
    const actions = renderDialog({ step: 'qr' });

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(actions.onClose).toHaveBeenCalledOnce();
  });

  // triste
  /* O coração da regra: enquanto a contagem corre, não dá para confirmar. */
  it('keeps the confirm button locked while the reading time is running', async () => {
    const actions = renderDialog({ secondsLeft: 7 });

    const confirm = screen.getByRole('button', { name: 'Leia os riscos (7s)' });
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);

    expect(actions.onConfirm).not.toHaveBeenCalled();
  });

  it('says the QR code is on its way while it has not arrived', () => {
    renderDialog({ step: 'qr' });

    expect(screen.getByRole('status')).toHaveTextContent('Gerando o QR code…');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the refusal inside the dialog', () => {
    renderDialog({ error: 'Vincular o WhatsApp é uma ação de administrador.' });

    expect(
      screen.getByText('Vincular o WhatsApp é uma ação de administrador.'),
    ).toBeInTheDocument();
  });

  it('draws nothing when closed', () => {
    renderDialog({ step: 'closed' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
