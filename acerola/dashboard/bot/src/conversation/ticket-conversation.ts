/**
 * A CONVERSA de chamados — o que o bot responde a quem escreve para um número vinculado.
 *
 * Esta camada não conhece o Baileys: recebe texto, devolve texto. É ela que continua valendo
 * no dia em que o transporte for trocado pela API oficial do WhatsApp.
 */

/** O comando que começa tudo. Quem escreve isto para um número vinculado está falando com o bot. */
export const TICKET_COMMAND = '/chamado';

/* Primeira versão: o bot só prova que ouviu. As perguntas do chamado entram na próxima etapa. */
const GREETING = 'oi';

/**
 * A resposta para uma mensagem que chegou — ou nulo quando ela não é para o bot.
 *
 * Nulo é o caso comum, e é de propósito: o número vinculado é o WhatsApp pessoal de alguém, e
 * quase tudo que chega nele é conversa que não tem nada a ver com chamado. O bot só fala quando
 * a mensagem é EXATAMENTE o comando (ignorando espaços em volta e maiúsculas) — "/chamado" no
 * meio de uma frase não conta.
 */
export function replyToMessage(text: string): string | null {
  if (text.trim().toLowerCase() !== TICKET_COMMAND) return null;

  return GREETING;
}
