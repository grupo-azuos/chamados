import { type WhatsappNoticeFailure } from '@template/shared/schemas/whatsapp-notice.schema';

import { type WhatsappSendOutcome } from './whatsapp-messaging.service';

/**
 * A REGRA DA FILA DE SAÍDA: depois de cada tentativa, o que fazer com a mensagem.
 *
 * Pura — recebe o desfecho e as datas, devolve a decisão. Quem grava é o entregador
 * (`WhatsappOutboxService`).
 */

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** Quanto tempo um aviso tenta sair. Depois de 1 dia, chegaria tarde demais para ajudar. */
export const WHATSAPP_QUEUE_TTL_MS = 24 * HOUR_MS;

/* A espera entre tentativas dobra a cada uma: 30 s, 1 min, 2 min… até 30 min. Bot fora do ar
   costuma voltar em segundos; celular desconectado, em horas — e martelar não adianta. */
const FIRST_RETRY_MS = 30 * SECOND_MS;
const MAX_RETRY_MS = 30 * MINUTE_MS;

/* O aviso adiado pelo limite do dia sai no dia seguinte a esta hora, e não à meia-noite. */
const NEXT_DAY_SEND_HOUR = 8;

export type OutboxDecision =
  | { action: 'sent' }
  | { action: 'retry'; at: Date; reason: WhatsappNoticeFailure; expiresAt?: Date }
  | { action: 'stop'; status: 'failed' | 'discarded'; reason: WhatsappNoticeFailure };

/** O "recebi o seu chamado" não espera o dia seguinte: amanhã ele já não diz nada. */
export function isDiscardedAtLimit(kind: string): boolean {
  return kind === 'ticket_opened';
}

export function retryDelayMs(attempts: number): number {
  return Math.min(FIRST_RETRY_MS * 2 ** Math.max(attempts - 1, 0), MAX_RETRY_MS);
}

export type OutboxAttempt = {
  outcome: WhatsappSendOutcome;
  kind: string;
  /** Quantas tentativas, contando esta. */
  attempts: number;
  expiresAt: Date | null;
  now: Date;
  /** A meia-noite de hoje no fuso de quem usa — de onde sai o "amanhã" do limite. */
  startOfToday: Date;
};

export function decideAfterAttempt(attempt: OutboxAttempt): OutboxDecision {
  const { outcome, now } = attempt;
  if (outcome === 'sent') return { action: 'sent' };
  if (outcome === 'limit_reached') return afterLimit(attempt);
  /* Sem bot, sem vínculo, número sem WhatsApp: tentar de novo dá o mesmo resultado. */
  if (outcome !== 'not_connected' && outcome !== 'failed') {
    return { action: 'stop', status: 'failed', reason: outcome };
  }

  const at = new Date(now.getTime() + retryDelayMs(attempt.attempts));
  if (attempt.expiresAt && at >= attempt.expiresAt) {
    return { action: 'stop', status: 'failed', reason: 'expired' };
  }

  return { action: 'retry', at, reason: outcome };
}

/** A mensagem passou da validade antes de sair? Aí nem chama o bot. */
export function isExpired(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && now >= expiresAt;
}

function afterLimit(attempt: OutboxAttempt): OutboxDecision {
  if (isDiscardedAtLimit(attempt.kind)) {
    return { action: 'stop', status: 'discarded', reason: 'limit_reached' };
  }

  const at = new Date(attempt.startOfToday.getTime() + 24 * HOUR_MS + NEXT_DAY_SEND_HOUR * HOUR_MS);

  /* Adiado de propósito: a validade anda junto, senão ele venceria esperando o dia virar. */
  return {
    action: 'retry',
    at,
    reason: 'limit_reached',
    expiresAt: new Date(at.getTime() + WHATSAPP_QUEUE_TTL_MS),
  };
}
