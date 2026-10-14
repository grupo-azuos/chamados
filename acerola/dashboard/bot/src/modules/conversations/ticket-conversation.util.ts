/**
 * A CONVERSA de chamados, do lado do bot — o PORTEIRO.
 *
 * O número vinculado é o WhatsApp pessoal de alguém: quase tudo o que chega nele é conversa
 * que não tem nada a ver com chamado, e nada disso pode sair do bot. Esta camada decide o que
 * é encaminhado ao servidor:
 *
 *   - a mensagem que é EXATAMENTE um comando: `/chamado` ou `/acesso`;
 *   - as mensagens de uma conversa que o servidor disse estar aberta (a pessoa está no meio de
 *     abrir um chamado), até ela fechar ou vencer.
 *
 * Todo o resto fica aqui e é esquecido. Mesmo o que passaria tem teto por conversa
 * (`inbound-rate-limit.util`): acima dele, silêncio. Quem sabe o que responder — o formulário, a leitura
 * dele, a criação do chamado — é o servidor; o bot só entrega.
 *
 * Não conhece o Baileys: recebe texto, devolve texto.
 */

import {
  createRateLimiter,
  DEFAULT_INBOUND_RATE_LIMIT,
  type InboundRateLimit,
} from './inbound-rate-limit.util.js';

/** O comando que começa tudo. */
export const TICKET_COMMAND = '/chamado';

/** O comando do pedido de acesso: o servidor pergunta os dados um por um, na conversa. */
export const ACCESS_REQUEST_COMMAND = '/acesso';

const COMMANDS: readonly string[] = [TICKET_COMMAND, ACCESS_REQUEST_COMMAND];

/* Sem resposta do servidor de que a conversa continua, ela vence sozinha neste tempo — o mesmo
   prazo que o servidor dá para a pessoa devolver o formulário. */
const OPEN_CONVERSATION_TTL_MS = 15 * 60 * 1000;

export type IncomingMessage = {
  /** De qual número vinculado é a conversa. */
  sessionId: string;
  /** O endereço da conversa no WhatsApp. */
  chatId: string;
  text: string;
  /** O telefone de quem escreveu, quando o WhatsApp o informa. */
  phone: string | null;
  /** O identificador da mensagem no WhatsApp: é com ele que o servidor descarta a repetida. */
  messageId?: string | null;
};

/** `isDuplicate`: a mensagem já tinha chegado ao servidor — nada a responder nem a mudar. */
export type ServerReply = { reply: string | null; isOpen: boolean; isDuplicate?: boolean };

/** Quem leva a mensagem ao servidor. Nulo quando o servidor não respondeu. */
export type ForwardToServer = (message: IncomingMessage) => Promise<ServerReply | null>;

export type ConversationGate = (message: IncomingMessage, now?: number) => Promise<string | null>;

/**
 * Onde as conversas abertas de um número vinculado ficam guardadas (conversa → quando vence),
 * para um reinício do bot não largar a pessoa no meio do `/acesso`.
 */
export type OpenConversationMemory = {
  load(sessionId: string): Promise<Record<string, number>>;
  save(sessionId: string, open: Record<string, number>): Promise<void>;
};

export function isTicketCommand(text: string): boolean {
  return COMMANDS.includes(text.trim().toLowerCase());
}

export function createConversationGate(
  forward: ForwardToServer,
  rateLimit: InboundRateLimit = DEFAULT_INBOUND_RATE_LIMIT,
  memory?: OpenConversationMemory,
): ConversationGate {
  /* número vinculado → conversa → quando vence. */
  const open = new Map<string, Map<string, number>>();
  const withinLimit = createRateLimiter(rateLimit);

  /* Na primeira mensagem de cada número desde que o bot subiu, o que estava aberto volta da
     memória. Memória ilegível vale como nada aberto: o pior caso é a pessoa repetir o comando. */
  async function openOf(sessionId: string): Promise<Map<string, number>> {
    const known = open.get(sessionId);
    if (known) return known;

    const stored: Record<string, number> = (await memory?.load(sessionId).catch(() => ({}))) ?? {};
    const loaded = new Map(Object.entries(stored));
    open.set(sessionId, loaded);

    return loaded;
  }

  /* Fecha ou renova a conversa conforme o servidor disse. Servidor fora do ar conta como
     fechada: o bot não continua encaminhando o que a pessoa escrever para quem não responde. */
  async function remember(
    sessionId: string,
    chats: Map<string, number>,
    chatId: string,
    answer: ServerReply | null,
    now: number,
  ): Promise<void> {
    if (answer?.isOpen) chats.set(chatId, now + OPEN_CONVERSATION_TTL_MS);
    else chats.delete(chatId);

    const stillOpen = [...chats].filter(([, expiresAt]) => expiresAt > now);
    await memory?.save(sessionId, Object.fromEntries(stillOpen)).catch(() => undefined);
  }

  return async (message, now = Date.now()) => {
    const chats = await openOf(message.sessionId);
    const isOpen = (chats.get(message.chatId) ?? 0) > now;
    if (!isOpen && !isTicketCommand(message.text)) {
      chats.delete(message.chatId);

      return null;
    }
    /* Só conta o que iria ao servidor: conversa comum não é do bot, nem limitada por ele. A
       conversa aberta continua aberta — passada a janela, a pessoa segue de onde parou. */
    if (!withinLimit(`${message.sessionId}:${message.chatId}`, now)) return null;

    const answer = await forward(message);
    /* Entrega repetida pelo WhatsApp: fechar a conversa por causa dela largaria a pessoa. */
    if (answer?.isDuplicate) return null;

    await remember(message.sessionId, chats, message.chatId, answer, now);

    return answer?.reply ?? null;
  };
}
