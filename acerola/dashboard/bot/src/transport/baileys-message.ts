import { isJidUser, isLidUser, type WAMessage } from 'baileys';

/** Uma mensagem de texto que chegou numa conversa privada, pronta para a camada de conversa. */
export type PrivateText = {
  /** O endereço da conversa no WhatsApp — é para ele que a resposta volta. */
  chatId: string;
  text: string;
};

/* Mensagem mais velha que isto não é respondida. Quando o bot volta de uma queda, o WhatsApp
   entrega de uma vez o que chegou enquanto ele estava fora: responder a esse lote seria uma
   rajada de mensagens automáticas — o comportamento que mais chama a atenção do WhatsApp — e
   uma resposta de horas atrás não ajuda ninguém. */
const MAX_MESSAGE_AGE_SECONDS = 120;

/**
 * O texto de uma mensagem que o bot PODE responder — ou nulo.
 *
 * O número vinculado é o WhatsApp pessoal de alguém, então o filtro é restritivo. Fica de fora:
 *  - o que a própria pessoa mandou (senão o bot responderia a ela mesma, em qualquer conversa);
 *  - grupo, lista de transmissão, status e canal: o bot só fala em conversa privada;
 *  - o que não é texto (foto, áudio, figurinha);
 *  - mensagem antiga (ver `MAX_MESSAGE_AGE_SECONDS`).
 */
export function readPrivateText(message: WAMessage, nowSeconds: number): PrivateText | null {
  const chatId = message.key.remoteJid;
  if (message.key.fromMe || !chatId || !isPrivateChat(chatId)) return null;
  if (!isRecent(message, nowSeconds)) return null;

  const text = textOf(message);

  return text ? { chatId, text } : null;
}

/* Sem horário a mensagem conta como velha: na dúvida, o bot não responde. */
function isRecent(message: WAMessage, nowSeconds: number): boolean {
  return nowSeconds - Number(message.messageTimestamp ?? 0) <= MAX_MESSAGE_AGE_SECONDS;
}

/* Texto simples chega num campo; texto com link ou em resposta a outra mensagem, em outro. */
function textOf(message: WAMessage): string | null | undefined {
  return message.message?.conversation ?? message.message?.extendedTextMessage?.text;
}

/* Conversa privada tem dois formatos de endereço: o do telefone e o identificador anônimo
   (`@lid`) que o WhatsApp passou a usar no lugar dele. */
function isPrivateChat(chatId: string): boolean {
  return Boolean(isJidUser(chatId) || isLidUser(chatId));
}
