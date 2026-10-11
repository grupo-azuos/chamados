import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { z } from 'zod';

import { type WhatsAppTransport } from '../../modules/sessions/whatsapp-transport.type.js';
import {
  RecipientNotFoundError,
  SessionNotConnectedError,
} from '../../modules/sessions/whatsapp-transport.util.js';
import { isValidSessionId } from '../storage/session-id.util.js';

/* Uma mensagem de WhatsApp tem teto de 65.536 caracteres; o corpo JSON inteiro cabe com folga. */
const MAX_BODY_BYTES = 128 * 1024;

const sendMessageSchema = z.object({
  to: z.string().min(1).max(32),
  text: z.string().trim().min(1).max(4096),
});

type Reply = { status: number; body?: unknown };
type RouteContext = { transport: WhatsAppTransport; sessionId: string; request: IncomingMessage };
type RouteHandler = (context: RouteContext) => Promise<Reply> | Reply;

/* `METHOD rota-depois-do-id` → o que fazer. A rota depois do id é '' ou '/messages'. */
const ROUTES: Record<string, RouteHandler> = {
  'GET ': ({ transport, sessionId }) => ({ status: 200, body: transport.status(sessionId) }),
  'POST /link': async ({ transport, sessionId }) => ({
    status: 200,
    body: await transport.link(sessionId),
  }),
  'DELETE ': async ({ transport, sessionId }) => {
    await transport.unlink(sessionId);

    return { status: 204 };
  },
  'POST /messages': async ({ transport, sessionId, request }) => {
    const message = sendMessageSchema.safeParse(await readJson(request));
    if (!message.success) return { status: 422, body: { message: 'Invalid message' } };

    await transport.sendText(sessionId, message.data.to, message.data.text);

    return { status: 202 };
  },
};

const SESSION_PATH = /^\/sessions\/([^/]+)(\/link|\/messages)?$/;

/**
 * A API do bot: é por aqui, e só por aqui, que o servidor fala com o WhatsApp.
 *
 *   GET    /health                  está de pé? (sem token)
 *   GET    /sessions/:id            situação do vínculo
 *   POST   /sessions/:id/link       começa o vínculo (devolve o QR code na situação)
 *   DELETE /sessions/:id            desvincula
 *   POST   /sessions/:id/messages   manda uma mensagem de texto
 *
 * Tudo, menos `/health`, exige `Authorization: Bearer <BOT_API_TOKEN>`.
 */
export function createBotServer(transport: WhatsAppTransport, apiToken: string): Server {
  return createServer((request, response) => {
    void handle(transport, apiToken, request)
      .catch(toErrorReply)
      .then((reply) => send(response, reply));
  });
}

async function handle(
  transport: WhatsAppTransport,
  apiToken: string,
  request: IncomingMessage,
): Promise<Reply> {
  const path = (request.url ?? '').split('?')[0] ?? '';
  if (request.method === 'GET' && path === '/health')
    return { status: 200, body: { status: 'ok' } };
  if (!isAuthorized(request, apiToken)) return { status: 401, body: { message: 'Unauthorized' } };

  const target = parseSessionPath(path);
  if (!target) return { status: 404, body: { message: 'Not found' } };

  const route = ROUTES[`${request.method} ${target.action}`];
  if (!route) return { status: 405, body: { message: 'Method not allowed' } };

  return route({ transport, sessionId: target.sessionId, request });
}

/** A sessão e a ação de um caminho, ou nulo quando o caminho não é de sessão ou o id é inválido. */
function parseSessionPath(path: string): { sessionId: string; action: string } | null {
  const match = SESSION_PATH.exec(path);
  const sessionId = match?.[1];
  if (!sessionId || !isValidSessionId(sessionId)) return null;

  return { sessionId, action: match[2] ?? '' };
}

/* Comparação em tempo constante: comparar com `===` deixa medir, pelo tempo de resposta,
   quantos caracteres do token alguém já acertou. */
function isAuthorized(request: IncomingMessage, apiToken: string): boolean {
  const presented = Buffer.from(request.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${apiToken}`);

  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

class BodyTooLargeError extends Error {}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(chunk as Buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function toErrorReply(error: unknown): Reply {
  if (error instanceof SessionNotConnectedError) {
    return { status: 409, body: { code: 'not_connected', message: error.message } };
  }
  if (error instanceof RecipientNotFoundError) {
    return { status: 422, body: { code: 'recipient_not_found', message: error.message } };
  }
  if (error instanceof BodyTooLargeError)
    return { status: 413, body: { message: 'Body too large' } };

  return { status: 500, body: { message: 'Internal error' } };
}

function send(response: ServerResponse, reply: Reply): void {
  if (reply.body === undefined) {
    response.writeHead(reply.status).end();

    return;
  }

  response
    .writeHead(reply.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    .end(JSON.stringify(reply.body));
}
