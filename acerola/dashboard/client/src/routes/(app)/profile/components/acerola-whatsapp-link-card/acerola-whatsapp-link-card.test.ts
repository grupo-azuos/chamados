import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WhatsappLinkCard, {
  type AcerolaWhatsappLinkCardProps,
} from './acerola-whatsapp-link-card.svelte';

function renderCard(state: Partial<AcerolaWhatsappLinkCardProps['state']> = {}, phone = '') {
  const actions = { onLink: vi.fn(), onUnlink: vi.fn() };

  render(WhatsappLinkCard, {
    props: {
      data: { phone },
      state: { isConfigured: true, linkState: 'disconnected', ...state },
      actions,
    },
  });

  return actions;
}

describe('AcerolaWhatsappLinkCard', () => {
  // feliz
  it('offers to link when there is no number', async () => {
    const actions = renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Vincular WhatsApp' }));

    expect(actions.onLink).toHaveBeenCalledOnce();
    expect(screen.queryByText('Conectado')).not.toBeInTheDocument();
  });

  it('shows the linked number and offers to unlink', async () => {
    const actions = renderCard({ linkState: 'connected' }, '+55 (62) 99999-0001');

    expect(screen.getByText('+55 (62) 99999-0001')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }));

    expect(actions.onUnlink).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Vincular WhatsApp' })).not.toBeInTheDocument();
  });

  it('lets a link that was started be continued', () => {
    renderCard({ linkState: 'pairing' });

    expect(screen.getByRole('button', { name: 'Continuar vínculo' })).toBeInTheDocument();
  });

  // triste
  /* Sem o bot na instalação não há o que vincular: o cartão explica e não oferece botão. */
  it('explains, and offers no button, when the integration is not configured', () => {
    renderCard({ isConfigured: false });

    expect(screen.getByText(/ainda não foi configurada/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers no button while the status is loading', () => {
    renderCard({ isLoading: true });

    expect(screen.getByText('Conferindo o vínculo…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the failure of the WhatsApp service', () => {
    renderCard({ error: 'Não consegui falar com o serviço de WhatsApp.' });

    expect(screen.getByText('Não consegui falar com o serviço de WhatsApp.')).toBeInTheDocument();
  });
});
