/**
 * A PORTA DO WHATSAPP — a única coisa que o resto do bot conhece.
 *
 * Hoje quem atende é o Baileys (`baileys-transport.ts`), que fala o protocolo do WhatsApp Web.
 * No dia em que a API oficial entrar, é este contrato que ela passa a atender: nada acima
 * desta linha sabe o que é QR code de Baileys, socket ou chave de sinal.
 */
export type SessionState = 'disconnected' | 'pairing' | 'connected';

export type SessionStatus = {
  state: SessionState;
  /** O conteúdo do QR code enquanto o vínculo espera a leitura; nulo fora disso. */
  qr: string | null;
  /** O número vinculado, só dígitos com DDI; nulo enquanto não conectou. */
  phone: string | null;
};

export const DISCONNECTED_STATUS: SessionStatus = { state: 'disconnected', qr: null, phone: null };

/** Um texto que chegou numa conversa privada de um número vinculado. */
export type ReceivedText = {
  sessionId: string;
  chatId: string;
  text: string;
  /** O telefone de quem escreveu, só dígitos com DDI — nulo quando o WhatsApp não o informa. */
  phone: string | null;
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

/** A sessão não está conectada: não há por onde enviar. */
export class SessionNotConnectedError extends Error {
  constructor() {
    super('Session is not connected');
    this.name = 'SessionNotConnectedError';
  }
}

/** O número de destino não tem WhatsApp. */
export class RecipientNotFoundError extends Error {
  constructor() {
    super('Recipient is not on WhatsApp');
    this.name = 'RecipientNotFoundError';
  }
}

/* Com DDI e DDD, um telefone tem de 10 a 15 dígitos (E.164). */
const PHONE_PATTERN = /^\d{10,15}$/;

/** Só dígitos, ou nulo quando o que veio não é um telefone com DDI. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');

  return PHONE_PATTERN.test(digits) ? digits : null;
}

/**
 * O número de um identificador do WhatsApp. O formato é `5562999990001:12@s.whatsapp.net`:
 * o que vem depois de `:` é o aparelho, e depois de `@`, o servidor.
 */
export function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid) return null;

  return normalizePhone(jid.split('@')[0]?.split(':')[0] ?? '');
}
