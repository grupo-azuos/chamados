import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { decryptSessionValue, encryptSessionValue } from './session-cipher.js';
import { assertValidSessionId, isValidSessionId, type SessionStore } from './session-store.js';

/**
 * As conexões em DISCO, um arquivo cifrado por chave, uma pasta por sessão.
 *
 * O nome do arquivo é o hash da chave, não a chave: as chaves do WhatsApp trazem números de
 * telefone de contatos, e nome de arquivo não é cifrado.
 */
export function createEncryptedFileStore(directory: string, hexKey: string): SessionStore {
  const sessionDirectory = (sessionId: string): string => {
    assertValidSessionId(sessionId);

    return join(directory, sessionId);
  };
  const filePath = (sessionId: string, key: string): string =>
    join(sessionDirectory(sessionId), `${createHash('sha256').update(key).digest('hex')}.enc`);

  return {
    async read(sessionId, key) {
      const content = await readFile(filePath(sessionId, key), 'utf8').catch(ignoreMissing);

      return content === null ? null : decryptSessionValue(content, hexKey);
    },

    async write(sessionId, key, value) {
      await mkdir(sessionDirectory(sessionId), { recursive: true, mode: 0o700 });
      await writeFile(filePath(sessionId, key), encryptSessionValue(value, hexKey), {
        mode: 0o600,
      });
    },

    async remove(sessionId, key) {
      await rm(filePath(sessionId, key), { force: true });
    },

    async clear(sessionId) {
      await rm(sessionDirectory(sessionId), { recursive: true, force: true });
    },

    async list() {
      const entries = await readdir(directory, { withFileTypes: true }).catch(ignoreMissing);

      return (entries ?? [])
        .filter((entry) => entry.isDirectory() && isValidSessionId(entry.name))
        .map((entry) => entry.name);
    },
  };
}

/* Arquivo ou pasta que não existe é "nada guardado", não erro. Qualquer outra falha sobe. */
function ignoreMissing(error: unknown): null {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;

  throw error;
}
