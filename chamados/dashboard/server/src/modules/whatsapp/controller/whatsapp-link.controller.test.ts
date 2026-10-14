import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type WhatsappLinkService } from '../service/whatsapp-link.service';
import { WhatsappLinkController } from './whatsapp-link.controller';

const ana: RequestUser = { id: 'u-ana', email: 'ana@exemplo.com', name: 'Ana Lima', role: 'admin' };
const CONNECTION = {
  isConfigured: true,
  canLink: true,
  state: 'connected' as const,
  qr: null,
  phone: '5562999990001',
  sentToday: 3,
  dailyLimit: 100,
};

function makeController() {
  const service = {
    status: vi.fn().mockResolvedValue(CONNECTION),
    link: vi.fn().mockResolvedValue({ ...CONNECTION, state: 'pairing', qr: 'qr', phone: null }),
    unlink: vi.fn().mockResolvedValue(undefined),
  };

  return {
    controller: new WhatsappLinkController(service as unknown as WhatsappLinkService),
    service,
  };
}

describe('WhatsappLinkController', () => {
  // feliz
  /* Nenhuma rota recebe o id de alguém: quem vai para o service é sempre a identidade. */
  it('asks the service for the link of the very person who is logged in', async () => {
    const { controller, service } = makeController();

    expect(await controller.status(ana)).toEqual(CONNECTION);
    expect(service.status).toHaveBeenCalledWith(ana);
  });

  it('starts and removes the link under the same identity', async () => {
    const { controller, service } = makeController();

    expect((await controller.link(ana)).state).toBe('pairing');
    await controller.unlink(ana);

    expect(service.link).toHaveBeenCalledWith(ana);
    expect(service.unlink).toHaveBeenCalledWith(ana);
  });

  // triste
  /* A recusa é do service (a policy mora lá): o controller só deixa passar. */
  it('lets the refusal of the service reach the caller', async () => {
    const { controller, service } = makeController();
    service.link.mockRejectedValue(new Error('forbidden'));

    await expect(controller.link(ana)).rejects.toThrow('forbidden');
  });
});
