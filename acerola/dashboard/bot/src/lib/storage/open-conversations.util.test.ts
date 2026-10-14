import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEncryptedFileStore } from './encrypted-file-store.util.js';
import { createOpenConversationMemory } from './open-conversations.util.js';
import { type SessionStore } from './session-store.type.js';

const KEY = 'c'.repeat(64);
const SESSION = 'a'.repeat(64);

describe('open conversation memory', () => {
  let directory: string;
  let store: SessionStore;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'bot-open-'));
    store = createEncryptedFileStore(directory, KEY);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  // feliz
  it('reads back the open conversations of a linked number', async () => {
    const memory = createOpenConversationMemory(store);

    await memory.save(SESSION, { '5562999990002@s.whatsapp.net': 1_800_000_000_000 });

    expect(await memory.load(SESSION)).toEqual({
      '5562999990002@s.whatsapp.net': 1_800_000_000_000,
    });
  });

  /* Sem conversa aberta, nada fica guardado: o endereço de quem escreveu não fica à toa. */
  it('leaves nothing stored once no conversation is open', async () => {
    const memory = createOpenConversationMemory(store);
    await memory.save(SESSION, { chat: 1 });

    await memory.save(SESSION, {});

    expect(await store.read(SESSION, 'open-conversations')).toBeNull();
  });

  // triste
  it('starts with no open conversation when nothing was stored', async () => {
    expect(await createOpenConversationMemory(store).load(SESSION)).toEqual({});
  });

  /* Arquivo estragado vale como "nenhuma conversa aberta" — e não derruba o bot. */
  it('ignores a broken record instead of failing', async () => {
    await store.write(SESSION, 'open-conversations', 'not json');
    expect(await createOpenConversationMemory(store).load(SESSION)).toEqual({});

    await store.write(SESSION, 'open-conversations', '{"chat":"tomorrow","other":5}');
    expect(await createOpenConversationMemory(store).load(SESSION)).toEqual({ other: 5 });
  });
});
