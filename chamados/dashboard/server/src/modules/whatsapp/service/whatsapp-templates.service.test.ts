import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATES,
} from '@template/shared/domain/whatsapp-template.util';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type WhatsappTemplatesRepository } from '../repository/whatsapp-templates.repository';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

const superAdmin: RequestUser = {
  id: 'u-root',
  email: 'root@exemplo.com',
  name: 'Root',
  role: 'superadmin',
};
const admin: RequestUser = { id: 'u-ana', email: 'ana@exemplo.com', name: 'Ana', role: 'admin' };

function makeService(rows: { key: string; body: string }[] = []) {
  const repository = {
    list: vi.fn().mockResolvedValue(rows),
    find: vi.fn(async (key: string) => rows.find((row) => row.key === key) ?? null),
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  return {
    service: new WhatsappTemplatesService(repository as unknown as WhatsappTemplatesRepository),
    repository,
  };
}

describe('WhatsappTemplatesService.list', () => {
  // feliz
  it('lists every message, with the edited text where there is one', async () => {
    const { service } = makeService([{ key: 'ticket_ready', body: 'Pronto, {{nome}}!' }]);

    const templates = await service.list(superAdmin);

    expect(templates.map((template) => template.key)).toEqual([...WHATSAPP_TEMPLATE_KEYS]);
    expect(templates.find((template) => template.key === 'ticket_ready')).toMatchObject({
      body: 'Pronto, {{nome}}!',
      isCustomized: true,
      defaultBody: WHATSAPP_TEMPLATES.ticket_ready.defaultBody,
    });
    expect(templates.find((template) => template.key === 'ticket_opened')?.isCustomized).toBe(
      false,
    );
  });

  // triste
  it('refuses anyone who is not the super admin', async () => {
    await expect(makeService().service.list(admin)).rejects.toThrow(ForbiddenException);
  });
});

describe('WhatsappTemplatesService.update', () => {
  // feliz
  it('saves the new text under the name of who changed it', async () => {
    const { service, repository } = makeService();

    const saved = await service.update(superAdmin, 'ticket_ready', { body: ' Pronto, {{nome}}! ' });

    expect(repository.save).toHaveBeenCalledWith(
      'ticket_ready',
      'Pronto, {{nome}}!',
      'root@exemplo.com',
    );
    expect(saved).toMatchObject({ body: 'Pronto, {{nome}}!', isCustomized: true });
  });

  // triste
  /* Escalada de privilégio: admin comum não muda o texto que sai pelo número dos outros. */
  it('refuses an admin before touching the repository', async () => {
    const { service, repository } = makeService();

    await expect(service.update(admin, 'ticket_ready', { body: 'x' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refuses a variable that does not exist for that message', async () => {
    const { service, repository } = makeService();

    const attempt = service.update(superAdmin, 'ticket_ready', { body: 'Olá {{var}}' });

    await expect(attempt).rejects.toThrow(UnprocessableEntityException);
    await expect(attempt).rejects.toThrow(/\{\{var\}\}/);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('refuses a message that does not exist', async () => {
    await expect(makeService().service.update(superAdmin, 'nope', { body: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('WhatsappTemplatesService.restore', () => {
  // feliz
  it('drops the edited text and hands back the original', async () => {
    const { service, repository } = makeService([{ key: 'ticket_ready', body: 'editado' }]);

    const restored = await service.restore(superAdmin, 'ticket_ready');

    expect(repository.remove).toHaveBeenCalledWith('ticket_ready');
    expect(restored).toMatchObject({
      body: WHATSAPP_TEMPLATES.ticket_ready.defaultBody,
      isCustomized: false,
    });
  });

  // triste
  it('refuses anyone who is not the super admin', async () => {
    await expect(makeService().service.restore(admin, 'ticket_ready')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('WhatsappTemplatesService.render', () => {
  // feliz
  it('fills the edited text when there is one, and the original otherwise', async () => {
    const { service } = makeService([{ key: 'ticket_ready', body: 'Pronto, {{nome}}!' }]);

    expect(await service.render('ticket_ready', { nome: 'Bia' })).toBe('Pronto, Bia!');
    expect(await service.render('limit_alert', { enviadas: '70', limite: '100' })).toContain(
      '70 de 100',
    );
  });
});
