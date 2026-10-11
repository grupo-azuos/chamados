import { describe, expect, it, vi } from 'vitest';

import {
  createConversationGate,
  type ForwardToServer,
  type IncomingMessage,
  isTicketCommand,
} from './ticket-conversation.util.js';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

function message(text: string, chatId = '5562999990002@s.whatsapp.net'): IncomingMessage {
  return { sessionId: 'a'.repeat(64), chatId, text, phone: '5562999990002' };
}

function forwardAnswering(...answers: ({ reply: string | null; isOpen: boolean } | null)[]) {
  const forward = vi.fn<ForwardToServer>();
  for (const answer of answers) forward.mockResolvedValueOnce(answer);

  return forward;
}

describe('isTicketCommand', () => {
  // feliz
  it('recognizes the command with spaces around it and in any case', () => {
    expect(isTicketCommand('/chamado')).toBe(true);
    expect(isTicketCommand('  /CHAMADO \n')).toBe(true);
  });

  // triste
  it('refuses the command inside a sentence, and ordinary conversation', () => {
    expect(isTicketCommand('como uso o /chamado?')).toBe(false);
    expect(isTicketCommand('/chamado urgente')).toBe(false);
    expect(isTicketCommand('oi')).toBe(false);
    expect(isTicketCommand('')).toBe(false);
  });
});

describe('conversation gate', () => {
  // feliz
  it('forwards the command and hands back what the server answered', async () => {
    const forward = forwardAnswering({ reply: 'Preencha o formulário', isOpen: true });
    const gate = createConversationGate(forward);

    expect(await gate(message('/chamado'), NOW)).toBe('Preencha o formulário');
    expect(forward).toHaveBeenCalledWith(message('/chamado'));
  });

  it('forwards what the person writes next while the conversation is open', async () => {
    const forward = forwardAnswering(
      { reply: 'Preencha o formulário', isOpen: true },
      { reply: 'Chamado CH-0007 aberto', isOpen: false },
    );
    const gate = createConversationGate(forward);

    await gate(message('/chamado'), NOW);

    expect(await gate(message('Nome: Bia'), NOW + MINUTE)).toBe('Chamado CH-0007 aberto');
    expect(forward).toHaveBeenCalledTimes(2);
  });

  // triste
  /* O coração da privacidade: conversa comum não sai do bot. */
  it('never forwards ordinary conversation', async () => {
    const forward = forwardAnswering();
    const gate = createConversationGate(forward);

    expect(await gate(message('oi, tudo bem?'), NOW)).toBeNull();
    expect(await gate(message('me liga quando puder'), NOW)).toBeNull();
    expect(forward).not.toHaveBeenCalled();
  });

  it('stops forwarding once the server closes the conversation', async () => {
    const forward = forwardAnswering(
      { reply: 'Preencha o formulário', isOpen: true },
      { reply: 'Chamado aberto', isOpen: false },
    );
    const gate = createConversationGate(forward);

    await gate(message('/chamado'), NOW);
    await gate(message('Nome: Bia'), NOW + MINUTE);

    expect(await gate(message('obrigada!'), NOW + 2 * MINUTE)).toBeNull();
    expect(forward).toHaveBeenCalledTimes(2);
  });

  it('stops forwarding when the open conversation expires', async () => {
    const forward = forwardAnswering({ reply: 'Preencha o formulário', isOpen: true });
    const gate = createConversationGate(forward);

    await gate(message('/chamado'), NOW);

    expect(await gate(message('Nome: Bia'), NOW + 16 * MINUTE)).toBeNull();
    expect(forward).toHaveBeenCalledTimes(1);
  });

  it('keeps one conversation apart from another', async () => {
    const forward = forwardAnswering({ reply: 'Preencha o formulário', isOpen: true });
    const gate = createConversationGate(forward);

    await gate(message('/chamado'), NOW);

    expect(await gate(message('oi', '5562999990003@s.whatsapp.net'), NOW)).toBeNull();
    expect(forward).toHaveBeenCalledTimes(1);
  });

  /* Servidor fora do ar: o bot se cala e fecha a conversa, em vez de seguir encaminhando. */
  it('goes silent and closes the conversation when the server does not answer', async () => {
    const forward = forwardAnswering({ reply: 'Preencha o formulário', isOpen: true }, null);
    const gate = createConversationGate(forward);

    await gate(message('/chamado'), NOW);

    expect(await gate(message('Nome: Bia'), NOW + MINUTE)).toBeNull();
    expect(await gate(message('alô?'), NOW + 2 * MINUTE)).toBeNull();
    expect(forward).toHaveBeenCalledTimes(2);
  });
});
