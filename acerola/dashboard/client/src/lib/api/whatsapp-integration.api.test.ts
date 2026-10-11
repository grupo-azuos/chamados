import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({ apiRequest: vi.fn().mockResolvedValue(undefined) }));

const { apiRequest } = await import('./http-client');
const { whatsappIntegrationApi } = await import('./whatsapp-integration.api');

describe('whatsappIntegrationApi', () => {
  beforeEach(() => vi.mocked(apiRequest).mockClear());

  // feliz
  /* Nenhuma rota leva o id de alguém: é sempre o vínculo de quem está logado. */
  it('reads, starts and removes the link of the logged person, without any id in the address', async () => {
    await whatsappIntegrationApi.status();
    await whatsappIntegrationApi.link();
    await whatsappIntegrationApi.unlink();

    expect(vi.mocked(apiRequest).mock.calls).toEqual([
      ['/integrations/whatsapp/status'],
      ['/integrations/whatsapp/link', { method: 'POST' }],
      ['/integrations/whatsapp', { method: 'DELETE' }],
    ]);
  });

  it('lists the bot texts, saves one by its key and restores it', async () => {
    await whatsappIntegrationApi.templates();
    await whatsappIntegrationApi.updateTemplate('ticket_ready', { body: 'Olá {{nome}}!' });
    await whatsappIntegrationApi.restoreTemplate('ticket_ready');

    expect(vi.mocked(apiRequest).mock.calls).toEqual([
      ['/integrations/whatsapp/templates'],
      [
        '/integrations/whatsapp/templates/ticket_ready',
        { method: 'PATCH', body: { body: 'Olá {{nome}}!' } },
      ],
      ['/integrations/whatsapp/templates/ticket_ready', { method: 'DELETE' }],
    ]);
  });

  // triste
  it('lets the failure of the request reach whoever called', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline'));

    await expect(whatsappIntegrationApi.status()).rejects.toThrow('offline');
  });
});
