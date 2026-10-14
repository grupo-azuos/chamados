/**
 * O LIMITE de mensagens que UM número pode mandar ao bot de UM responsável.
 *
 * Cada mensagem que passa pelo porteiro vira trabalho no servidor e, quase sempre, uma resposta
 * automática saindo do WhatsApp pessoal de quem atende. Alguém mandando `/chamado` sem parar
 * (de brincadeira ou por um robô) gastaria o limite do dia do responsável e aproximaria o número
 * dele de um bloqueio do WhatsApp. Passou do teto, o bot fica em silêncio com aquela pessoa até
 * a janela andar — sem avisar, porque o aviso também seria uma mensagem automática.
 *
 * Janela deslizante: conta só o que chegou nos últimos `windowMs`. Fica em memória, como o
 * resto do porteiro: o bot roda numa instância só, e um reinício só zera a contagem.
 */

export type InboundRateLimit = { limit: number; windowMs: number };

/** Uma conversa de pedido de acesso tem uns 6 a 10 passos; o teto deixa folga para errar. */
export const DEFAULT_INBOUND_RATE_LIMIT: InboundRateLimit = { limit: 20, windowMs: 10 * 60_000 };

/** Diz se a mensagem cabe no limite e, se couber, já a conta. */
export type RateLimiter = (key: string, now: number) => boolean;

export function createRateLimiter({ limit, windowMs }: InboundRateLimit): RateLimiter {
  /* conversa → quando chegou cada mensagem ainda dentro da janela. */
  const hits = new Map<string, number[]>();

  return (key, now) => {
    const recent = (hits.get(key) ?? []).filter((at) => at > now - windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);

      return false;
    }

    hits.set(key, [...recent, now]);

    return true;
  };
}
