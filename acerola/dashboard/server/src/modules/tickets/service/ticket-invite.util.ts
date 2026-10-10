import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/**
 * A ASSINATURA do convite de chamado.
 *
 * O link que o bot manda leva, dentro dele, com quem a pessoa quer falar, o telefone dela e
 * até quando vale — e uma assinatura do servidor por cima. Sem a assinatura, qualquer um
 * montaria um link abrindo chamado "em nome" do telefone de outra pessoa. Nada é gravado em
 * banco: o que o link diz é o que vale, enquanto a assinatura conferir e o prazo não passar.
 *
 * Formato: `conteudo.assinatura`, as duas partes em base64url.
 */
const payloadSchema = z.object({
  /** O responsável. */
  a: z.string().min(1),
  /** O telefone de quem escreveu, ou nulo. */
  p: z
    .string()
    .regex(/^\d{10,15}$/)
    .nullable(),
  /** Até quando vale, em segundos desde 1970. */
  e: z.number().int().positive(),
});

export type TicketInvitePayload = { assigneeId: string; phone: string | null; expiresAt: number };

/* A chave de assinatura sai do segredo do bot, mas não É o segredo do bot: derivar dá uma
   chave só para convites, e vazar uma assinatura não diz nada sobre o token. */
function signingKey(secret: string, purpose: string): Buffer {
  return createHmac('sha256', secret).update(purpose).digest();
}

/* Cada tipo de link tem a própria chave: a assinatura de um convite não serve de assinatura de
   um link de consulta, mesmo que alguém acerte o formato do conteúdo. */
const INVITE_PURPOSE = 'ticket-invite';
const ACCESS_PURPOSE = 'ticket-access';

function sign(content: string, secret: string, purpose: string = INVITE_PURPOSE): string {
  return createHmac('sha256', signingKey(secret, purpose)).update(content).digest('base64url');
}

export function signTicketInvite(payload: TicketInvitePayload, secret: string): string {
  const content = Buffer.from(
    JSON.stringify({ a: payload.assigneeId, p: payload.phone, e: payload.expiresAt }),
  ).toString('base64url');

  return `${content}.${sign(content, secret)}`;
}

/**
 * O que o convite diz — ou nulo quando ele não vale: assinatura que não confere, prazo vencido
 * ou conteúdo que não é um convite. Um motivo só para os três: quem tenta forjar um link não
 * precisa saber em qual passo errou.
 */
export function verifyTicketInvite(
  token: string,
  secret: string,
  nowSeconds: number,
): TicketInvitePayload | null {
  const [content, signature, ...rest] = token.split('.');
  if (!content || !signature || rest.length > 0) return null;
  if (!hasValidSignature(content, signature, secret)) return null;

  const payload = payloadSchema.safeParse(parseJson(Buffer.from(content, 'base64url').toString()));
  if (!payload.success || payload.data.e < nowSeconds) return null;

  return { assigneeId: payload.data.a, phone: payload.data.p, expiresAt: payload.data.e };
}

/* Comparação em tempo constante: `===` deixaria descobrir a assinatura caractere por caractere. */
function hasValidSignature(
  content: string,
  signature: string,
  secret: string,
  purpose: string = INVITE_PURPOSE,
): boolean {
  const presented = Buffer.from(signature);
  const expected = Buffer.from(sign(content, secret, purpose));

  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * O LINK DE CONSULTA de um chamado — o que vai nas mensagens ("acompanhe por aqui").
 *
 * Leva só o número do chamado, assinado. Quem tem o link abre AQUELE chamado sem digitar
 * protocolo; quem não tem não consegue fabricar um para o chamado de outra pessoa trocando o
 * número. Não vence: é para a pessoa voltar a ele enquanto o chamado existir.
 */
const accessSchema = z.object({ t: z.number().int().positive() });

export function signTicketAccess(ticketId: number, secret: string): string {
  const content = Buffer.from(JSON.stringify({ t: ticketId })).toString('base64url');

  return `${content}.${sign(content, secret, ACCESS_PURPOSE)}`;
}

/** O número do chamado que o link abre — ou nulo quando a assinatura não confere. */
export function verifyTicketAccess(token: string, secret: string): number | null {
  const [content, signature, ...rest] = token.split('.');
  if (!content || !signature || rest.length > 0) return null;
  if (!hasValidSignature(content, signature, secret, ACCESS_PURPOSE)) return null;

  const payload = accessSchema.safeParse(parseJson(Buffer.from(content, 'base64url').toString()));

  return payload.success ? payload.data.t : null;
}
