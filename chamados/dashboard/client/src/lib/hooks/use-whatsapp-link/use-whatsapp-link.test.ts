import { type WhatsappConnection } from '@template/shared/schemas/whatsapp-connection.schema';
import { render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-whatsapp-link-harness.test.svelte';
import { RISK_READING_SECONDS, type useWhatsappLinkModel } from './use-whatsapp-link.svelte';

type WhatsappLinkModel = ReturnType<typeof useWhatsappLinkModel>;

vi.mock('$lib/api/whatsapp-integration.api', () => ({
  whatsappIntegrationApi: { status: vi.fn(), link: vi.fn(), unlink: vi.fn() },
}));
/* A imagem do QR code é da biblioteca; aqui importa só que o conteúdo vira imagem. */
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn(async (content: string) => `data:image/png;qr=${content}`) },
}));

const { whatsappIntegrationApi } = await import('$lib/api/whatsapp-integration.api');

function connection(over: Partial<WhatsappConnection> = {}): WhatsappConnection {
  return {
    isConfigured: true,
    canLink: true,
    state: 'disconnected',
    qr: null,
    phone: null,
    sentToday: 0,
    dailyLimit: 100,
    ...over,
  };
}

async function mountModel(): Promise<WhatsappLinkModel> {
  let model!: WhatsappLinkModel;
  render(Harness, { props: { onReady: (ready: WhatsappLinkModel) => (model = ready) } });
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

/** Abre o diálogo e deixa o tempo de leitura dos riscos passar. */
async function readRisks(model: WhatsappLinkModel): Promise<void> {
  model.actions.onOpen();
  await vi.advanceTimersByTimeAsync(RISK_READING_SECONDS * 1000);
}

describe('useWhatsappLinkModel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(whatsappIntegrationApi.status).mockReset().mockResolvedValue(connection());
    vi.mocked(whatsappIntegrationApi.link).mockReset();
    vi.mocked(whatsappIntegrationApi.unlink).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => vi.useRealTimers());

  // feliz
  it('tells whether the person can link, and the usage of the day', async () => {
    vi.mocked(whatsappIntegrationApi.status).mockResolvedValue(
      connection({ state: 'connected', phone: '5562999990001', sentToday: 12 }),
    );

    const model = await mountModel();

    expect(model.state.canLink).toBe(true);
    expect(model.state.linkState).toBe('connected');
    expect(model.data).toMatchObject({
      phone: '+55 (62) 99999-0001',
      sentToday: 12,
      dailyLimit: 100,
    });
  });

  /* O coração do diálogo de riscos: o botão só destrava depois do tempo de leitura. */
  it('opens on the risks and unlocks the confirmation only after the reading time', async () => {
    const model = await mountModel();

    model.actions.onOpen();
    expect(model.state.step).toBe('risks');
    expect(model.state.secondsLeft).toBe(RISK_READING_SECONDS);

    await vi.advanceTimersByTimeAsync(3000);
    expect(model.state.secondsLeft).toBe(RISK_READING_SECONDS - 3);

    await vi.advanceTimersByTimeAsync(RISK_READING_SECONDS * 1000);
    expect(model.state.secondsLeft).toBe(0);
  });

  it('starts the link after the risks were read, and turns the QR code into an image', async () => {
    vi.mocked(whatsappIntegrationApi.link).mockResolvedValue(
      connection({ state: 'pairing', qr: 'qr-content' }),
    );
    const model = await mountModel();

    await readRisks(model);
    model.actions.onConfirmRisks();

    await waitFor(() => expect(model.state.step).toBe('qr'));
    await waitFor(() => expect(model.data.qrImage).toBe('data:image/png;qr=qr-content'));
  });

  /* O celular leu o código: o diálogo fecha sozinho. */
  it('closes the dialog by itself once the phone finishes the link', async () => {
    vi.mocked(whatsappIntegrationApi.link).mockResolvedValue(
      connection({ state: 'pairing', qr: 'qr' }),
    );
    const model = await mountModel();
    await readRisks(model);
    model.actions.onConfirmRisks();
    await waitFor(() => expect(model.state.step).toBe('qr'));

    vi.mocked(whatsappIntegrationApi.status).mockResolvedValue(
      connection({ state: 'connected', phone: '5562999990001' }),
    );
    await vi.advanceTimersByTimeAsync(2500);

    await waitFor(() => expect(model.state.step).toBe('closed'));
    expect(model.state.linkState).toBe('connected');
  });

  it('unlinks after the confirmation and closes the question', async () => {
    const model = await mountModel();

    model.actions.onAskUnlink();
    expect(model.state.isUnlinkOpen).toBe(true);
    model.actions.onConfirmUnlink();

    await waitFor(() => expect(whatsappIntegrationApi.unlink).toHaveBeenCalledOnce());
    await waitFor(() => expect(model.state.isUnlinkOpen).toBe(false));
  });

  // triste
  /* Clicar antes da hora não vincula: é o que garante que os riscos ficaram na tela. */
  it('ignores the confirmation while the reading time is still running', async () => {
    const model = await mountModel();

    model.actions.onOpen();
    await vi.advanceTimersByTimeAsync(2000);
    model.actions.onConfirmRisks();

    expect(whatsappIntegrationApi.link).not.toHaveBeenCalled();
    expect(model.state.step).toBe('risks');
  });

  it('keeps the dialog on the risks, with the refusal, when the server says no', async () => {
    vi.mocked(whatsappIntegrationApi.link).mockRejectedValue(
      new ApiError(403, 'Vincular o WhatsApp é uma ação de administrador.'),
    );
    const model = await mountModel();

    await readRisks(model);
    model.actions.onConfirmRisks();

    await waitFor(() =>
      expect(model.state.linkError).toBe('Vincular o WhatsApp é uma ação de administrador.'),
    );
    expect(model.state.step).toBe('risks');
  });

  it('shows no QR image when there is no code to draw', async () => {
    const model = await mountModel();

    expect(model.data.qrImage).toBeNull();
  });

  it('does not offer to link to who is not allowed', async () => {
    vi.mocked(whatsappIntegrationApi.status).mockResolvedValue(connection({ canLink: false }));

    const model = await mountModel();

    expect(model.state.canLink).toBe(false);
  });

  it('closing drops the countdown and the dialog', async () => {
    const model = await mountModel();

    model.actions.onOpen();
    model.actions.onClose();

    expect(model.state.step).toBe('closed');
  });
});
