import { buildIntakeForm } from '@template/shared/domain/whatsapp-intake.util';
import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../../../lib/config/env.schema';
import { type TicketAssigneesService } from '../../tickets/service/ticket-assignees.service';
import { type TicketsService } from '../../tickets/service/tickets.service';
import { type WhatsappConnectionsRepository } from '../../whatsapp/repository/whatsapp-connections.repository';
import { botSessionId } from '../../whatsapp/service/bot-client.service';
import { type WhatsappMessagingService } from '../../whatsapp/service/whatsapp-messaging.service';
import { isBot } from '../controller/whatsapp-intake.controller';
import { type InboundMessage, WhatsappIntakeService } from './whatsapp-intake.service';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;
const SESSION = botSessionId('u-ana');

const inbound = (text: string, extra: Partial<InboundMessage> = {}): InboundMessage => ({
  sessionId: SESSION,
  chatId: '5562999990002@s.whatsapp.net',
  text,
  phone: '5562999990002',
  ...extra,
});

function filledForm(): string {
  return buildIntakeForm({ area: 'infra', projects: [], phone: '5562999990002' })
    .replace('*Nome:* ', '*Nome:* Bia Costa')
    .replace('*Setor (número):* ', '*Setor (número):* 6')
    .replace('*Tipo (número):* ', '*Tipo (número):* 3')
    .replace('*Descrição:* ', '*Descrição:* A impressora não puxa papel.');
}

function makeService(options: { areas?: string[]; hasRoom?: boolean; linked?: boolean } = {}) {
  const connections = {
    list: vi
      .fn()
      .mockResolvedValue(
        options.linked === false ? [] : [{ userId: 'u-ana', phone: '5562999990001' }],
      ),
  };
  const assignees = {
    areasOf: vi.fn().mockResolvedValue({ name: 'Ana Lima', areas: options.areas ?? ['infra'] }),
  };
  const tickets = {
    create: vi.fn().mockResolvedValue({ id: 7, requesterName: 'Bia Costa', assignee: 'Ana Lima' }),
    listSystemProjectOptions: vi.fn().mockResolvedValue([{ id: 11, name: 'Portal' }]),
  };
  const messaging = {
    reply: vi.fn(async (message: { kind: string; values: Record<string, string> }) =>
      options.hasRoom === false ? null : `text:${message.kind}`,
    ),
  };
  const service = new WhatsappIntakeService(
    { API_CORS_ORIGIN: 'http://localhost:5005' } as Env,
    connections as unknown as WhatsappConnectionsRepository,
    assignees as unknown as TicketAssigneesService,
    tickets as unknown as TicketsService,
    messaging as unknown as WhatsappMessagingService,
  );

  return { service, tickets, messaging, assignees };
}

describe('WhatsappIntakeService', () => {
  // feliz
  /* Quem atende uma área só: o /chamado já devolve o formulário daquela área. */
  it('answers the command with the form when the attendant has a single area', async () => {
    const { service, messaging } = makeService();

    expect(await service.handle(inbound('/chamado'), NOW)).toEqual({
      reply: 'text:intake_form',
      isOpen: true,
    });
    expect(messaging.reply.mock.calls[0]?.[0]).toMatchObject({
      senderUserId: 'u-ana',
      kind: 'intake_form',
      values: { responsavel: 'Ana Lima', area: 'Infraestrutura' },
    });
  });

  it('opens the ticket with the attendant as assignee when the form comes back filled', async () => {
    const { service, tickets } = makeService();

    await service.handle(inbound('/chamado'), NOW);
    const answer = await service.handle(inbound(filledForm()), NOW + MINUTE);

    expect(answer).toEqual({ reply: 'text:intake_created', isOpen: false });
    /* O último argumento desliga o aviso de "chamado aberto": a confirmação já vai na conversa. */
    expect(tickets.create).toHaveBeenCalledWith(
      {
        requesterName: 'Bia Costa',
        department: 'financeiro',
        problemType: 'printer',
        projectId: null,
        contactPhone: '5562999990002',
        description: 'A impressora não puxa papel.',
        area: 'infra',
        priority: 'medium',
        notifyWhatsapp: true,
        assigneeId: 'u-ana',
      },
      undefined,
      [],
      { skipOpeningNotice: true },
    );
  });

  /* Super admin, ou admin de mais de uma área: primeiro a pergunta de qual. */
  it('asks the area first when the attendant has more than one, then sends that form', async () => {
    const { service, messaging } = makeService({ areas: ['infra', 'manutencao'] });

    expect((await service.handle(inbound('/chamado'), NOW)).reply).toBe('text:intake_area');
    expect(messaging.reply.mock.calls[0]?.[0].values.opcoes).toBe(
      '1. Infraestrutura\n2. Manutenção',
    );

    expect((await service.handle(inbound('2'), NOW + MINUTE)).reply).toBe('text:intake_form');
    expect(messaging.reply.mock.calls[1]?.[0].values.area).toBe('Manutenção');
  });

  it('lists the systems in the form of the Sistema area', async () => {
    const { service, messaging } = makeService({ areas: ['sistema'] });

    await service.handle(inbound('/chamado'), NOW);

    expect(messaging.reply.mock.calls[0]?.[0].values.formulario).toContain('*Opções de sistema*\n1. Portal');
  });

  // triste
  it('says what is missing and keeps the conversation open when the form is incomplete', async () => {
    const { service, tickets, messaging } = makeService();

    await service.handle(inbound('/chamado'), NOW);
    const answer = await service.handle(inbound('Nome: Bia'), NOW + MINUTE);

    expect(answer).toEqual({ reply: 'text:intake_invalid', isOpen: true });
    expect(messaging.reply.mock.calls[1]?.[0].values.erros).toContain('- ');
    expect(tickets.create).not.toHaveBeenCalled();
  });

  it('asks the area again when the choice is not on the list', async () => {
    const { service } = makeService({ areas: ['infra', 'manutencao'] });

    await service.handle(inbound('/chamado'), NOW);

    expect(await service.handle(inbound('9'), NOW + MINUTE)).toEqual({
      reply: 'text:intake_area',
      isOpen: true,
    });
  });

  /* Conversa comum não abre chamado nem recebe resposta. */
  it('stays silent for a message outside any conversation', async () => {
    const { service, messaging } = makeService();

    expect(await service.handle(inbound('oi, tudo bem?'), NOW)).toEqual({
      reply: null,
      isOpen: false,
    });
    expect(messaging.reply).not.toHaveBeenCalled();
  });

  it('closes the conversation when the person cancels, or takes too long', async () => {
    const { service, tickets } = makeService();

    await service.handle(inbound('/chamado'), NOW);
    expect(await service.handle(inbound('Cancelar'), NOW + MINUTE)).toEqual({
      reply: null,
      isOpen: false,
    });
    expect(await service.handle(inbound(filledForm()), NOW + 2 * MINUTE)).toEqual({
      reply: null,
      isOpen: false,
    });

    await service.handle(inbound('/chamado'), NOW);
    expect(await service.handle(inbound(filledForm()), NOW + 16 * MINUTE)).toEqual({
      reply: null,
      isOpen: false,
    });
    expect(tickets.create).not.toHaveBeenCalled();
  });

  /* Teto do dia atingido: o bot se cala, em vez de gastar mais uma mensagem dizendo que não pode. */
  it('goes silent when the daily limit of the attendant is reached', async () => {
    const { service } = makeService({ hasRoom: false });

    expect(await service.handle(inbound('/chamado'), NOW)).toEqual({ reply: null, isOpen: false });
  });

  it('stays silent for a number that is not linked, or whose owner attends no area', async () => {
    expect(await makeService({ linked: false }).service.handle(inbound('/chamado'), NOW)).toEqual({
      reply: null,
      isOpen: false,
    });
    expect(await makeService({ areas: [] }).service.handle(inbound('/chamado'), NOW)).toEqual({
      reply: null,
      isOpen: false,
    });
  });

  it('closes quietly when the ticket cannot be created', async () => {
    const { service, tickets } = makeService();
    tickets.create.mockRejectedValue(new Error('database down'));

    await service.handle(inbound('/chamado'), NOW);

    expect(await service.handle(inbound(filledForm()), NOW + MINUTE)).toEqual({
      reply: null,
      isOpen: false,
    });
  });

  it('keeps the conversation of one person apart from another', async () => {
    const { service } = makeService();

    await service.handle(inbound('/chamado'), NOW);
    const other = inbound(filledForm(), { chatId: '5562999990003@s.whatsapp.net' });

    expect(await service.handle(other, NOW + MINUTE)).toEqual({ reply: null, isOpen: false });
  });
});

describe('isBot', () => {
  const token = 't'.repeat(40);

  // feliz
  it('accepts the bearer token of the bot', () => {
    expect(isBot(`Bearer ${token}`, token)).toBe(true);
  });

  // triste
  /* Sem a integração configurada, a porta não abre para ninguém — nem com cabeçalho vazio. */
  it('refuses a wrong token, a missing header and an installation without the bot', () => {
    expect(isBot(`Bearer ${'x'.repeat(40)}`, token)).toBe(false);
    expect(isBot(undefined, token)).toBe(false);
    expect(isBot('Bearer undefined', undefined)).toBe(false);
    expect(isBot('', undefined)).toBe(false);
  });
});
