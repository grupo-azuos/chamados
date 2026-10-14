import { type SessionStatus } from './whatsapp-transport.type.js';

/** A situação de quem não tem vínculo — o que o transporte responde para uma sessão que não conhece. */
export const DISCONNECTED_STATUS: SessionStatus = { state: 'disconnected', qr: null, phone: null };

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
