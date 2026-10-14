/**
 * A PORTA DO WHATSAPP — a única coisa que o resto do bot conhece.
 *
 * Hoje quem atende é o Baileys (`baileys-transport.util.ts`), que fala o protocolo do WhatsApp
 * Web. No dia em que a API oficial entrar, é este contrato que ela passa a atender: nada acima
 * desta linha sabe o que é QR code de Baileys, socket ou chave de sinal.
 *
 * Os erros que o transporte lança e a situação "sem vínculo" moram em
 * `whatsapp-transport.util.ts`.
 */
export type SessionState = 'disconnected' | 'pairing' | 'connected';

export type SessionStatus = {
  state: SessionState;
  /** O conteúdo do QR code enquanto o vínculo espera a leitura; nulo fora disso. */
  qr: string | null;
  /** O número vinculado, só dígitos com DDI; nulo enquanto não conectou. */
  phone: string | null;
};

/** Um texto que chegou numa conversa privada de um número vinculado. */
export type ReceivedText = {
  sessionId: string;
  chatId: string;
  text: string;
  /** O telefone de quem escreveu, só dígitos com DDI — nulo quando o WhatsApp não o informa. */
  phone: string | null;
  /** O identificador da mensagem no WhatsApp: a mesma mensagem entregue de novo traz o mesmo. */
  messageId?: string | null;
};

/**
 * Quem decide o que responder a um texto que chegou. Devolve a resposta, ou nulo para ficar em
 * silêncio. O transporte entrega só texto de conversa privada e recente — e manda a resposta de
 * volta para a mesma conversa.
 */
export type MessageResponder = (message: ReceivedText) => Promise<string | null>;

export type WhatsAppTransport = {
  /** Começa (ou retoma) o vínculo. Chamar de novo com a sessão viva não reinicia nada. */
  link(sessionId: string): Promise<SessionStatus>;
  status(sessionId: string): SessionStatus;
  /** Desvincula: encerra no WhatsApp e apaga o que estava guardado. */
  unlink(sessionId: string): Promise<void>;
  sendText(sessionId: string, to: string, text: string): Promise<void>;
  /** Religa as sessões guardadas — chamado uma vez, quando o bot sobe. */
  restore(): Promise<void>;
  /** Encerra as conexões sem desvincular — chamado quando o bot desce. */
  close(): Promise<void>;
};
