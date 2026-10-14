import { type OpenConversationMemory } from '../../modules/conversations/ticket-conversation.util.js';
import { type SessionStore } from './session-store.type.js';

/**
 * Onde o porteiro guarda as conversas ABERTAS (quem está no meio de um `/acesso`), para um
 * reinício do bot não largar a pessoa no meio do pedido.
 *
 * Usa o mesmo cofre cifrado das conexões, mas numa pasta própria (ver `main.ts`): o endereço da
 * conversa identifica quem escreveu, e a lista das conexões não pode ver estas pastas como
 * números vinculados.
 */
const KEY = 'open-conversations';

export function createOpenConversationMemory(store: SessionStore): OpenConversationMemory {
  return {
    async load(sessionId) {
      const stored = await store.read(sessionId, KEY).catch(() => null);

      return parse(stored);
    },
    async save(sessionId, open) {
      if (Object.keys(open).length === 0) {
        await store.remove(sessionId, KEY);

        return;
      }

      await store.write(sessionId, KEY, JSON.stringify(open));
    },
  };
}

/* Arquivo estragado não derruba o bot: vale como "nenhuma conversa aberta". */
function parse(stored: string | null): Record<string, number> {
  if (!stored) return {};

  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object') return {};

    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      ),
    );
  } catch {
    return {};
  }
}
