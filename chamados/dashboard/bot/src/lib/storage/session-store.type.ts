/**
 * ONDE A CONEXÃO DE UM WHATSAPP FICA GUARDADA.
 *
 * Uma "sessão" é o vínculo de um número: as credenciais e as chaves de criptografia que o
 * WhatsApp entrega quando o QR code é lido. Quem tem esses dados É aquele WhatsApp — lê e manda
 * mensagem como a pessoa. Por isso nada aqui é guardado em texto puro.
 *
 * É uma interface para o lugar poder mudar (disco hoje; banco amanhã) sem tocar no resto.
 */
export type SessionStore = {
  read(sessionId: string, key: string): Promise<string | null>;
  write(sessionId: string, key: string, value: string): Promise<void>;
  remove(sessionId: string, key: string): Promise<void>;
  /** Apaga tudo de uma sessão — é o que "desvincular" faz. */
  clear(sessionId: string): Promise<void>;
  /** As sessões que têm algo guardado: é a lista que o bot religa quando sobe. */
  list(): Promise<string[]>;
};
