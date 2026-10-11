import { Inject, Injectable, Logger } from '@nestjs/common';
import { type WhatsappTemplateKey } from '@template/shared/domain/whatsapp-template.util';
import { whatsappAlertThreshold } from '@template/shared/schemas/whatsapp-connection.schema';

import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { WhatsappConnectionsRepository } from '../repository/whatsapp-connections.repository';
import { WhatsappMessagesRepository } from '../repository/whatsapp-messages.repository';
import { BotClientService, type BotSendOutcome } from './bot-client.service';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

/** O desfecho de um envio: os do bot, mais os dois que o servidor decide antes de chamá-lo. */
export type WhatsappSendOutcome = BotSendOutcome | 'not_linked' | 'limit_reached';

export type WhatsappUsage = { sentToday: number; dailyLimit: number };

export type WhatsappMessage = {
  /** De quem é o número que envia. */
  senderUserId: string;
  to: string;
  kind: WhatsappTemplateKey;
  values: Readonly<Record<string, string | null | undefined>>;
  ticketId: number | null;
};

/* O "dia" do limite é o de quem usa o sistema, não o do servidor (que roda em UTC). */
const LIMIT_TIME_ZONE = 'America/Sao_Paulo';

/**
 * TODA mensagem automática passa por aqui — é o único lugar que conta e que trava.
 *
 * O número é o pessoal de quem atende, e o WhatsApp bloqueia quem parece automação. Por isso
 * cada pessoa tem um teto diário: passou dele, o sistema para de enviar por ela até amanhã.
 * Perto do teto (70%), ela é avisada pelo próprio WhatsApp.
 */
@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly bot: BotClientService,
    private readonly connections: WhatsappConnectionsRepository,
    private readonly messages: WhatsappMessagesRepository,
    private readonly templates: WhatsappTemplatesService,
  ) {}

  async usage(userId: string): Promise<WhatsappUsage> {
    const sentToday = await this.messages.countSince(
      userId,
      startOfDay(new Date(), LIMIT_TIME_ZONE),
    );

    return { sentToday, dailyLimit: this.env.WHATSAPP_DAILY_LIMIT };
  }

  /** Há um número vinculado para esta pessoa? */
  async isLinked(userId: string): Promise<boolean> {
    return (await this.connections.find(userId)) !== null;
  }

  /**
   * Manda uma mensagem pelo número de alguém. Nunca lança: quem chama decide o que fazer com
   * o desfecho (quase sempre, cair no link manual).
   */
  async send(message: WhatsappMessage): Promise<WhatsappSendOutcome> {
    if (!this.bot.isConfigured) return 'not_configured';
    if (!(await this.isLinked(message.senderUserId))) return 'not_linked';
    if (!(await this.hasRoom(message.senderUserId))) return 'limit_reached';

    const text = await this.templates.render(message.kind, message.values);
    const outcome = await this.bot.sendText(message.senderUserId, message.to, text);
    if (outcome === 'sent') await this.count(message);

    return outcome;
  }

  /**
   * Reserva o envio de uma RESPOSTA que o próprio bot vai mandar (a conversa do /chamado): o
   * servidor só devolve o texto, e é o bot que o entrega. Devolve nulo quando o teto do dia já
   * foi atingido — e aí o bot fica em silêncio.
   */
  async reply(
    message: Omit<WhatsappMessage, 'to'> & { recipient: string },
  ): Promise<string | null> {
    if (!(await this.hasRoom(message.senderUserId))) return null;

    const text = await this.templates.render(message.kind, message.values);
    await this.count({ ...message, to: message.recipient });

    return text;
  }

  private async hasRoom(userId: string): Promise<boolean> {
    const { sentToday, dailyLimit } = await this.usage(userId);

    return sentToday < dailyLimit;
  }

  private async count(message: WhatsappMessage): Promise<void> {
    await this.messages.record({
      senderUserId: message.senderUserId,
      ticketId: message.ticketId,
      kind: message.kind,
      recipient: message.to,
    });

    const { sentToday, dailyLimit } = await this.usage(message.senderUserId);
    /* Exatamente no limiar, e não "a partir dele": o aviso sai UMA vez por dia. */
    if (sentToday === whatsappAlertThreshold(dailyLimit)) {
      await this.alert(message.senderUserId, sentToday, dailyLimit);
    }
  }

  /* O aviso vai para o próprio número da pessoa e NÃO conta no limite: contar faria o aviso
     gastar o que ele está avisando que acabou. */
  private async alert(userId: string, sentToday: number, dailyLimit: number): Promise<void> {
    const connection = await this.connections.find(userId);
    if (!connection) return;

    const text = await this.templates.render('limit_alert', {
      enviadas: String(sentToday),
      limite: String(dailyLimit),
    });
    const outcome = await this.bot.sendText(userId, connection.phone, text);
    if (outcome !== 'sent') this.logger.warn(`limit alert not delivered: ${outcome}`);
  }
}

/**
 * A meia-noite de hoje num fuso, como instante. Feito pela diferença entre "que horas são lá"
 * e "que horas são em UTC", para não depender de biblioteca de data.
 */
export function startOfDay(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const secondsIntoDay = read('hour') * 3600 + read('minute') * 60 + read('second');

  return new Date(Math.floor(now.getTime() / 1000) * 1000 - secondsIntoDay * 1000);
}
