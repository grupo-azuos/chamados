import { z } from 'zod';

import { type ForwardToServer } from '../../modules/conversations/ticket-conversation.util.js';

const replySchema = z.object({
  reply: z.string().nullable(),
  isOpen: z.boolean(),
  isDuplicate: z.boolean().optional(),
});

/* O servidor cria um chamado no meio desta chamada; mais que isto é ele fora do ar. */
const SERVER_TIMEOUT_MS = 15_000;

/**
 * Leva ao servidor uma mensagem que passou pelo porteiro, e traz a resposta.
 *
 * O bot se identifica com o mesmo `BOT_API_TOKEN` que o servidor usa para chamá-lo. Qualquer
 * falha vira nulo: quem decide o que fazer com o silêncio é o porteiro.
 */
export function createServerForwarder(serverUrl: string, apiToken: string): ForwardToServer {
  const url = `${serverUrl.replace(/\/+$/, '')}/integrations/whatsapp/inbound`;

  return async (message) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
    }).catch(() => null);
    if (!response?.ok) return null;

    const reply = replySchema.safeParse(await response.json().catch(() => null));

    return reply.success ? reply.data : null;
  };
}
