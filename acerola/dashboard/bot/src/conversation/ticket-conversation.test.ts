import { describe, expect, it } from 'vitest';

import { replyToMessage } from './ticket-conversation.js';

describe('replyToMessage', () => {
  // feliz
  it('greets whoever sends the ticket command', () => {
    expect(replyToMessage('/chamado')).toBe('oi');
  });

  it('accepts the command with spaces around it and in any case', () => {
    expect(replyToMessage('  /chamado \n')).toBe('oi');
    expect(replyToMessage('/CHAMADO')).toBe('oi');
    expect(replyToMessage('/Chamado')).toBe('oi');
  });

  // triste
  /* O número é o WhatsApp pessoal de alguém: conversa comum não pode acordar o bot. */
  it('stays silent for ordinary conversation', () => {
    expect(replyToMessage('oi, tudo bem?')).toBeNull();
    expect(replyToMessage('chamado')).toBeNull();
    expect(replyToMessage('')).toBeNull();
  });

  it('stays silent when the command is only part of a sentence', () => {
    expect(replyToMessage('como uso o /chamado?')).toBeNull();
    expect(replyToMessage('/chamado urgente')).toBeNull();
    expect(replyToMessage('/chamados')).toBeNull();
  });
});
