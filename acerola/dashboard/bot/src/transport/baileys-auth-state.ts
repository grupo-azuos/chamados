import {
  type AuthenticationCreds,
  type AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  type SignalDataSet,
  type SignalDataTypeMap,
} from 'baileys';

import { type SessionStore } from '../store/session-store.js';

const CREDS_KEY = 'creds';

export type StoredAuthState = {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
};

/**
 * O estado de autenticação do Baileys, guardado no `SessionStore` em vez de em arquivos soltos.
 *
 * O Baileys traz um `useMultiFileAuthState` pronto, mas ele escreve JSON em texto puro — e esse
 * JSON é a conexão inteira do WhatsApp de alguém. Este faz o mesmo trabalho passando tudo pelo
 * armazenamento cifrado.
 */
export async function loadAuthState(
  store: SessionStore,
  sessionId: string,
): Promise<StoredAuthState> {
  const read = async <T>(key: string): Promise<T | null> => {
    const raw = await store.read(sessionId, key);

    return raw === null ? null : (JSON.parse(raw, BufferJSON.reviver) as T);
  };
  const write = (key: string, value: unknown): Promise<void> =>
    store.write(sessionId, key, JSON.stringify(value, BufferJSON.replacer));

  const creds = (await read<AuthenticationCreds>(CREDS_KEY)) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        async get(type, ids) {
          const entries = await Promise.all(
            ids.map(async (id) => [id, reviveKey(type, await read(`${type}-${id}`))] as const),
          );

          return Object.fromEntries(entries) as { [id: string]: SignalDataTypeMap[typeof type] };
        },
        async set(data) {
          await Promise.all(
            flattenKeys(data).map((entry) => persistKey(store, sessionId, entry, write)),
          );
        },
      },
    },
    saveCreds: () => write(CREDS_KEY, creds),
  };
}

type KeyEntry = { key: string; value: unknown };

function flattenKeys(data: SignalDataSet): KeyEntry[] {
  return Object.entries(data).flatMap(([type, values]) =>
    Object.entries(values ?? {}).map(([id, value]) => ({ key: `${type}-${id}`, value })),
  );
}

/* Valor nulo é o jeito de o Baileys dizer "apague esta chave". */
function persistKey(
  store: SessionStore,
  sessionId: string,
  entry: KeyEntry,
  write: (key: string, value: unknown) => Promise<void>,
): Promise<void> {
  if (entry.value == null) return store.remove(sessionId, entry.key);

  return write(entry.key, entry.value);
}

/* Esta chave precisa voltar como o objeto do protocolo, e não como JSON solto — sem isso a
   sincronização do aparelho falha depois de um reinício. */
function reviveKey(type: keyof SignalDataTypeMap, value: unknown): unknown {
  if (type !== 'app-state-sync-key' || !value) return value;

  return proto.Message.AppStateSyncKeyData.fromObject(value as Record<string, unknown>);
}
