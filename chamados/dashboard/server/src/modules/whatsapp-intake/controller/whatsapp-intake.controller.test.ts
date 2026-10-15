import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type WhatsappIntakeService } from '../service/whatsapp-intake.service';
import { isBot, WhatsappIntakeController } from './whatsapp-intake.controller';

const TOKEN = 't'.repeat(40);
const message = {
  sessionId: 'a'.repeat(64),
  chatId: '5562999990002@s.whatsapp.net',
  text: '/chamado',
  phone: '5562999990002',
};

function makeController(token: string | undefined = TOKEN) {
  const service = { handle: vi.fn().mockResolvedValue({ reply: 'link', isOpen: false }) };
  const controller = new WhatsappIntakeController(
    { BOT_API_TOKEN: token } as Env,
    service as unknown as WhatsappIntakeService,
  );

  return { controller, service };
}

describe('WhatsappIntakeController', () => {
  // feliz
  it('hands the message of the bot to the service and returns its answer', async () => {
    const { controller, service } = makeController();

    expect(await controller.handle(`Bearer ${TOKEN}`, message)).toEqual({
      reply: 'link',
      isOpen: false,
    });
    expect(service.handle).toHaveBeenCalledWith(message);
  });

  // triste
  /* A rota é pública só no sentido de não ter login: sem o token do bot, ninguém a usa. */
  it('refuses a call without the token of the bot, before reaching the service', () => {
    const { controller, service } = makeController();

    expect(() => controller.handle(undefined, message)).toThrow(UnauthorizedException);
    expect(() => controller.handle(`Bearer ${'x'.repeat(40)}`, message)).toThrow(
      UnauthorizedException,
    );
    expect(service.handle).not.toHaveBeenCalled();
  });

  it('refuses every call when the installation has no bot configured', () => {
    const { controller } = makeController(undefined);

    expect(() => controller.handle('Bearer undefined', message)).toThrow(UnauthorizedException);
  });
});

describe('isBot', () => {
  // feliz
  it('accepts the bearer token of the bot', () => {
    expect(isBot(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  // triste
  /* Sem a integração configurada, a porta não abre para ninguém — nem com cabeçalho vazio. */
  it('refuses a wrong token, a missing header and an installation without the bot', () => {
    expect(isBot(`Bearer ${'x'.repeat(40)}`, TOKEN)).toBe(false);
    expect(isBot(undefined, TOKEN)).toBe(false);
    expect(isBot('Bearer undefined', undefined)).toBe(false);
    expect(isBot('', undefined)).toBe(false);
  });
});
