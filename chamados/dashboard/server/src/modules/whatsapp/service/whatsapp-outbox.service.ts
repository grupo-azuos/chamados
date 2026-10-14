import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { type WhatsappMessageRow } from '../../../lib/db/schema/whatsapp-connections.schema';
import { WhatsappMessagesRepository } from '../repository/whatsapp-messages.repository';
import { BotClientService } from './bot-client.service';
import {
  LIMIT_TIME_ZONE,
  startOfDay,
  WhatsappMessagingService,
} from './whatsapp-messaging.service';
import { decideAfterAttempt, isExpired } from './whatsapp-outbox.util';

/* A cada volta sai no máximo UMA mensagem por número: 5 s entre voltas é o ritmo de quem
   digita, não o de um robô — o que importa para o WhatsApp não bloquear o número. */
const TICK_MS = 5000;
const BATCH_SIZE = 20;
/* Quanto a linha fica reservada enquanto é entregue. Se o servidor cair no meio, ela volta
   para a fila depois disto. Folga sobre o tempo máximo de uma chamada ao bot. */
const LEASE_MS = 2 * 60 * 1000;

/**
 * O ENTREGADOR da fila de saída do WhatsApp (padrão outbox).
 *
 * Quem cria o aviso só grava "precisa enviar" (`WhatsappMessagingService.queue`); este serviço
 * passa de tempos em tempos, pega o que está na vez e entrega pelo bot. Não saiu, a regra de
 * `whatsapp-outbox.util` decide: tentar de novo mais tarde, deixar para amanhã ou desistir.
 *
 * Roda dentro do servidor, sem fila externa: o banco já é a fila.
 */
@Injectable()
export class WhatsappOutboxService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WhatsappOutboxService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly bot: BotClientService,
    private readonly messages: WhatsappMessagesRepository,
    private readonly messaging: WhatsappMessagingService,
  ) {}

  /* Sem bot configurado nada entra na fila, e não há o que entregar. */
  onApplicationBootstrap(): void {
    if (!this.bot.isConfigured) return;

    this.timer = setInterval(() => void this.tick(), TICK_MS);
    /* Não segura o processo vivo: encerrar o servidor não espera a próxima volta. */
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Uma volta: pega o que está na vez e entrega. Público para o teste chamar sem relógio. */
  async tick(now: Date = new Date()): Promise<void> {
    /* Uma volta lenta (bot demorando) não pode se sobrepor à seguinte. */
    if (this.isRunning) return;

    this.isRunning = true;
    try {
      const due = await this.messages.claimDue(now, new Date(now.getTime() + LEASE_MS), BATCH_SIZE);
      for (const row of due) await this.deliver(row, now);
    } catch (error) {
      this.logger.error('whatsapp outbox tick failed', error instanceof Error ? error.stack : '');
    } finally {
      this.isRunning = false;
    }
  }

  private async deliver(row: WhatsappMessageRow, now: Date): Promise<void> {
    if (isExpired(row.expiresAt, now)) {
      await this.messages.stop(row.id, 'failed', 'expired');

      return;
    }

    const outcome = await this.messaging.deliver(row, now);
    const decision = decideAfterAttempt({
      outcome,
      kind: row.kind,
      attempts: row.attempts,
      expiresAt: row.expiresAt,
      now,
      startOfToday: startOfDay(now, LIMIT_TIME_ZONE),
    });

    if (decision.action === 'sent') return;
    if (decision.action === 'stop') {
      this.logger.warn(`whatsapp message ${row.id} stopped: ${decision.reason}`);
      await this.messages.stop(row.id, decision.status, decision.reason);

      return;
    }

    await this.messages.reschedule(row.id, decision.at, decision.reason, decision.expiresAt);
  }
}
