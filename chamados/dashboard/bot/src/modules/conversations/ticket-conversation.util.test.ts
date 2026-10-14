import { describe, expect, it, vi } from 'vitest';

import {
  createConversationGate,
  type ForwardToServer,
  type IncomingMessage,
  isTicketCommand,
  type ServerReply,
} from './ticket-conversation.util.js';

const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

function message(text: string, chatId = '5562999990002@s.whatsapp.net'): IncomingMessage {
  return { sessionId: 'a'.repeat(64), chatId, text, phone: '5562999990002' };
}

function forwardAnswering(...answers: (ServerReply | null)[]) {
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

  it('recognizes the access request command too', () => {
    expect(isTicketCommand('/acesso')).toBe(true);
    expect(isTicketCommand(' /Acesso ')).toBe(true);
  });

  // triste
  it('refuses the command inside a sentence, and ordinary conversation', () => {
    expect(isTicketCommand('como uso o /chamado?')).toBe(false);
    expect(isTicketCommand('/chamado urgente')).toBe(false);
    expect(isTicketCommand('/acesso ao sistema')).toBe(false);
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

  /* Quem dispara `/chamado` sem parar não gasta o limite do dia de quem atende. */
  it('goes silent with a number that passes the inbound limit', async () => {
    const forward = vi.fn<ForwardToServer>().mockResolvedValue({ reply: 'link', isOpen: false });
    const gate = createConversationGate(forward, { limit: 2, windowMs: 10 * MINUTE });

    await gate(message('/chamado'), NOW);
    await gate(message('/chamado'), NOW + 1);

    expect(await gate(message('/chamado'), NOW + 2)).toBeNull();
    expect(forward).toHaveBeenCalledTimes(2);
    expect(await gate(message('/chamado', '5562999990003@s.whatsapp.net'), NOW + 3)).toBe('link');
  });

  /* A mesma mensagem entregue de novo: o servidor avisa, e a conversa aberta continua aberta. */
  it('keeps the conversation open when the server says the message was a repeat', async () => {
    const forward = forwardAnswering(
      { reply: 'Qual o seu nome?', isOpen: true },
      { reply: null, isOpen: false, isDuplicate: true },
      { reply: 'Qual o seu e-mail?', isOpen: true },
    );
    const gate = createConversationGate(forward);

    await gate(message('/acesso'), NOW);

    expect(await gate(message('/acesso'), NOW + 1)).toBeNull();
    expect(await gate(message('Maria Clara'), NOW + 2)).toBe('Qual o seu e-mail?');
  });

  /* Reinício do bot no meio do /acesso: a conversa aberta volta da memória. */
  it('picks up an open conversation saved before a restart', async () => {
    const saved: Record<string, Record<string, number>> = {};
    const memory = {
      load: vi.fn(async (sessionId: string) => saved[sessionId] ?? {}),
      save: vi.fn(async (sessionId: string, open: Record<string, number>) => {
        saved[sessionId] = open;
      }),
    };
    await createConversationGate(
      forwardAnswering({ reply: 'Qual o seu nome?', isOpen: true }),
      undefined,
      memory,
    )(message('/acesso'), NOW);

    const forward = forwardAnswering({ reply: 'Qual o seu e-mail?', isOpen: true });
    const restarted = createConversationGate(forward, undefined, memory);

    expect(await restarted(message('Maria Clara'), NOW + MINUTE)).toBe('Qual o seu e-mail?');
    expect(memory.load).toHaveBeenCalledTimes(2);
  });

  it('starts with nothing open when the memory cannot be read', async () => {
    const memory = { load: vi.fn().mockRejectedValue(new Error('disk')), save: vi.fn() };
    const forward = forwardAnswering();
    const gate = createConversationGate(forward, undefined, memory);

    expect(await gate(message('Maria Clara'), NOW)).toBeNull();
    expect(forward).not.toHaveBeenCalled();
  });

  it('does not count ordinary conversation toward the limit', async () => {
    const forward = vi.fn<ForwardToServer>().mockResolvedValue({ reply: 'link', isOpen: false });
    const gate = createConversationGate(forward, { limit: 1, windowMs: 10 * MINUTE });

    await gate(message('oi'), NOW);
    await gate(message('tudo bem?'), NOW + 1);

    expect(await gate(message('/chamado'), NOW + 2)).toBe('link');
  });
});
