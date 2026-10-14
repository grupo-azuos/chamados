import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WhatsappLinkCard, {
  type AzuosWhatsappLinkCardProps,
} from './azuos-whatsapp-link-card.svelte';

function renderCard(
  state: Partial<AzuosWhatsappLinkCardProps['state']> = {},
  phone = '',
  extra: { sentToday?: number; dailyLimit?: number; onEditTemplates?: () => void } = {},
) {
  const actions = { onLink: vi.fn(), onUnlink: vi.fn(), onEditTemplates: extra.onEditTemplates };

  render(WhatsappLinkCard, {
    props: {
      data: { phone, sentToday: extra.sentToday, dailyLimit: extra.dailyLimit },
      state: { isConfigured: true, linkState: 'disconnected', ...state },
      actions,
    },
  });

  return actions;
}

describe('AzuosWhatsappLinkCard', () => {
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

  // feliz
  it('tells how many automatic messages went out today', () => {
    renderCard({ linkState: 'connected' }, '+55 (62) 99999-0001', {
      sentToday: 12,
      dailyLimit: 100,
    });

    expect(screen.getByText(/12 de 100 mensagens automáticas hoje/)).toBeInTheDocument();
    expect(screen.queryByText(/Perto do limite/)).not.toBeInTheDocument();
  });

  /* A 70% do teto o contador avisa — o mesmo ponto em que o WhatsApp da pessoa recebe o alerta. */
  it('warns when the day is close to the safe limit, and when it was reached', () => {
    renderCard({ linkState: 'connected' }, '+55 (62) 99999-0001', {
      sentToday: 70,
      dailyLimit: 100,
    });
    expect(screen.getByText(/Perto do limite seguro do dia/)).toBeInTheDocument();
  });

  it('says the limit was reached and when sending comes back', () => {
    renderCard({ linkState: 'connected' }, '+55 (62) 99999-0001', {
      sentToday: 100,
      dailyLimit: 100,
    });

    expect(screen.getByText(/Limite atingido/)).toBeInTheDocument();
  });

  it('opens the bot texts for who is allowed to edit them', async () => {
    const onEditTemplates = vi.fn();
    renderCard({}, '', { onEditTemplates });

    await userEvent.click(screen.getByRole('button', { name: 'Textos do bot' }));

    expect(onEditTemplates).toHaveBeenCalledOnce();
  });

  // triste
  /* Só o super admin recebe a ação: sem ela, o botão dos textos não existe. */
  it('hides the bot texts button from who cannot edit them', () => {
    renderCard();

    expect(screen.queryByRole('button', { name: 'Textos do bot' })).not.toBeInTheDocument();
  });

  it('shows no counter while there is no linked number', () => {
    renderCard({}, '', { sentToday: 5, dailyLimit: 100 });

    expect(screen.queryByText(/mensagens automáticas hoje/)).not.toBeInTheDocument();
  });
});
