/**
 * A CONVERSA de chamados, do lado do bot — o PORTEIRO.
 *
 * O número vinculado é o WhatsApp pessoal de alguém: quase tudo o que chega nele é conversa
 * que não tem nada a ver com chamado, e nada disso pode sair do bot. Esta camada decide o que
 * é encaminhado ao servidor:
 *
 *   - a mensagem que é EXATAMENTE o comando `/chamado`;
 *   - as mensagens de uma conversa que o servidor disse estar aberta (a pessoa está no meio de
 *     abrir um chamado), até ela fechar ou vencer.
 *
 * Todo o resto fica aqui e é esquecido. Quem sabe o que responder — o formulário, a leitura
 * dele, a criação do chamado — é o servidor; o bot só entrega.
 *
 * Não conhece o Baileys: recebe texto, devolve texto.
 */

/** O comando que começa tudo. */
export const TICKET_COMMAND = '/chamado';

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
};

export type ServerReply = { reply: string | null; isOpen: boolean };

/** Quem leva a mensagem ao servidor. Nulo quando o servidor não respondeu. */
export type ForwardToServer = (message: IncomingMessage) => Promise<ServerReply | null>;

export type ConversationGate = (message: IncomingMessage, now?: number) => Promise<string | null>;

export function isTicketCommand(text: string): boolean {
  return text.trim().toLowerCase() === TICKET_COMMAND;
}

export function createConversationGate(forward: ForwardToServer): ConversationGate {
  /* conversa → quando vence. */
  const open = new Map<string, number>();

  /* Fecha ou renova a conversa conforme o servidor disse. Servidor fora do ar conta como
     fechada: o bot não continua encaminhando o que a pessoa escrever para quem não responde. */
  function remember(key: string, answer: ServerReply | null, now: number): void {
    if (answer?.isOpen) open.set(key, now + OPEN_CONVERSATION_TTL_MS);
    else open.delete(key);
  }

  return async (message, now = Date.now()) => {
    const key = `${message.sessionId}:${message.chatId}`;
    const isOpen = (open.get(key) ?? 0) > now;
    if (!isOpen && !isTicketCommand(message.text)) {
      open.delete(key);

      return null;
    }

    const answer = await forward(message);
    remember(key, answer, now);

    return answer?.reply ?? null;
  };
}
