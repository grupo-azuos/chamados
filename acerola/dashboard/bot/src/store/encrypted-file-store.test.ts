import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEncryptedFileStore } from './encrypted-file-store.js';
import { isValidSessionId, type SessionStore } from './session-store.js';

const KEY = 'c'.repeat(64);

describe('encrypted file store', () => {
  let directory: string;
  let store: SessionStore;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'bot-store-'));
    store = createEncryptedFileStore(directory, KEY);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  // feliz
  it('reads back what it wrote', async () => {
    await store.write('user-1', 'creds', '{"registered":true}');

    expect(await store.read('user-1', 'creds')).toBe('{"registered":true}');
  });

  /* Nem o conteúdo nem o nome do arquivo podem trazer o que foi guardado: as chaves do
     WhatsApp carregam números de telefone. */
  it('leaves neither the value nor the key readable on disk', async () => {
    await store.write('user-1', 'session-5562999990001', 'secret-value');

    const [file] = await readdir(join(directory, 'user-1'));
    const content = await readFile(join(directory, 'user-1', file ?? ''), 'utf8');

    expect(file).not.toContain('5562999990001');
    expect(content).not.toContain('secret-value');
  });

  it('lists only the sessions that have something stored', async () => {
    await store.write('user-1', 'creds', 'a');
    await store.write('user-2', 'creds', 'b');
    await store.clear('user-2');

    expect(await store.list()).toEqual(['user-1']);
  });

  it('forgets one key without touching the others', async () => {
    await store.write('user-1', 'creds', 'a');
    await store.write('user-1', 'pre-key-1', 'b');
    await store.remove('user-1', 'pre-key-1');

    expect(await store.read('user-1', 'pre-key-1')).toBeNull();
    expect(await store.read('user-1', 'creds')).toBe('a');
  });

  // triste
  it('answers null for what was never stored', async () => {
    expect(await store.read('user-1', 'creds')).toBeNull();
  });

  it('lists nothing when the data folder does not exist yet (edge case)', async () => {
    const empty = createEncryptedFileStore(join(directory, 'missing'), KEY);

    expect(await empty.list()).toEqual([]);
  });

  /* O id vira nome de pasta: um `../` aqui escreveria fora da pasta de dados. */
  it('refuses a session id that would escape the data folder', async () => {
    await expect(store.write('../outside', 'creds', 'a')).rejects.toThrow('Invalid session id');
    await expect(store.clear('..')).rejects.toThrow('Invalid session id');
  });

  it('does not open a value written with another key', async () => {
    await store.write('user-1', 'creds', 'a');
    const other = createEncryptedFileStore(directory, 'd'.repeat(64));

    await expect(other.read('user-1', 'creds')).rejects.toThrow();
  });
});

describe('isValidSessionId', () => {
  // feliz
  it('accepts the ids the auth provider hands out', () => {
    expect(isValidSessionId('3f1c9a52-7d5e-4c0b-9a1e-2b6f0d8e4c11')).toBe(true);
    expect(isValidSessionId('user_42')).toBe(true);
  });

  // triste
  it('refuses path separators, dots and empty ids', () => {
    for (const id of ['', '.', '..', 'a/b', 'a\\b', 'a.b', 'a b', 'x'.repeat(129)]) {
      expect(isValidSessionId(id)).toBe(false);
    }
  });
});
