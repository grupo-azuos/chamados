import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type WhatsappTemplatesService } from '../service/whatsapp-templates.service';
import { WhatsappTemplatesController } from './whatsapp-templates.controller';

const root: RequestUser = {
  id: 'u-root',
  email: 'root@exemplo.com',
  name: 'Root',
  role: 'superadmin',
};
const TEMPLATE = {
  key: 'ticket_ready' as const,
  label: 'Chamado pronto',
  description: 'Enviada quando o chamado fica pronto.',
  variables: ['nome', 'protocolo'],
  body: 'Olá, {{nome}}!',
  defaultBody: 'Olá, {{nome}}!',
  isCustomized: false,
};

function makeController() {
  const service = {
    list: vi.fn().mockResolvedValue([TEMPLATE]),
    update: vi
      .fn()
      .mockResolvedValue({ ...TEMPLATE, body: 'Pronto, {{nome}}!', isCustomized: true }),
    restore: vi.fn().mockResolvedValue(TEMPLATE),
  };

  return {
    controller: new WhatsappTemplatesController(service as unknown as WhatsappTemplatesService),
    service,
  };
}

describe('WhatsappTemplatesController', () => {
  // feliz
  it('lists the texts for who is asking', async () => {
    const { controller, service } = makeController();

    expect(await controller.list(root)).toEqual([TEMPLATE]);
    expect(service.list).toHaveBeenCalledWith(root);
  });

  it('hands the key and the new text to the service, under the identity of who changed it', async () => {
    const { controller, service } = makeController();

    const saved = await controller.update(root, 'ticket_ready', { body: 'Pronto, {{nome}}!' });

    expect(service.update).toHaveBeenCalledWith(root, 'ticket_ready', {
      body: 'Pronto, {{nome}}!',
    });
    expect(saved.isCustomized).toBe(true);
  });

  it('restores a text by its key', async () => {
    const { controller, service } = makeController();

    await controller.restore(root, 'ticket_ready');

    expect(service.restore).toHaveBeenCalledWith(root, 'ticket_ready');
  });

  // triste
  /* Quem não é super admin é recusado pelo service; o controller não engole a recusa. */
  it('lets the refusal of the service reach the caller', async () => {
    const { controller, service } = makeController();
    service.update.mockRejectedValue(new Error('forbidden'));

    await expect(controller.update(root, 'ticket_ready', { body: 'x' })).rejects.toThrow(
      'forbidden',
    );
  });
});
