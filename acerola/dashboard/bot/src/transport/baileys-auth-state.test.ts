import { describe, expect, it } from 'vitest';

import { type SessionStore } from '../store/session-store.js';
import { loadAuthState } from './baileys-auth-state.js';

function memoryStore(): SessionStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const at = (sessionId: string, key: string): string => `${sessionId}/${key}`;

  return {
    data,
    read: async (sessionId, key) => data.get(at(sessionId, key)) ?? null,
    write: async (sessionId, key, value) => void data.set(at(sessionId, key), value),
    remove: async (sessionId, key) => void data.delete(at(sessionId, key)),
    clear: async () => data.clear(),
    list: async () => [],
  };
}

describe('loadAuthState', () => {
  // feliz
  it('starts fresh credentials for a session never seen', async () => {
    const { state } = await loadAuthState(memoryStore(), 'user-1');

    expect(state.creds.registered).toBe(false);
    expect(state.creds.me).toBeUndefined();
  });

  /* As credenciais têm chaves binárias: têm que voltar como bytes, e não como texto. */
  it('gives back the same credentials after saving, binary keys included', async () => {
    const store = memoryStore();
    const first = await loadAuthState(store, 'user-1');
    await first.saveCreds();

    const second = await loadAuthState(store, 'user-1');

    expect(Buffer.isBuffer(second.state.creds.noiseKey.private)).toBe(true);
    expect(second.state.creds.noiseKey.private).toEqual(first.state.creds.noiseKey.private);
  });

  it('stores signal keys and reads them back by id', async () => {
    const { state } = await loadAuthState(memoryStore(), 'user-1');
    const pair = { public: Buffer.from([1, 2]), private: Buffer.from([3, 4]) };

    await state.keys.set({ 'pre-key': { '7': pair } });

    expect(await state.keys.get('pre-key', ['7'])).toEqual({ '7': pair });
  });

  it('keeps each session apart from the others', async () => {
    const store = memoryStore();
    const one = await loadAuthState(store, 'user-1');
    await one.state.keys.set({
      'pre-key': { '7': { public: Buffer.from([1]), private: Buffer.from([2]) } },
    });

    const two = await loadAuthState(store, 'user-2');

    expect(await two.state.keys.get('pre-key', ['7'])).toEqual({ '7': null });
  });

  // triste
  /* Nulo é o jeito de o Baileys pedir para apagar: a chave tem que sumir do armazenamento. */
  it('deletes a key when it is set to null', async () => {
    const store = memoryStore();
    const { state } = await loadAuthState(store, 'user-1');
    await state.keys.set({
      'pre-key': { '7': { public: Buffer.from([1]), private: Buffer.from([2]) } },
    });

    await state.keys.set({ 'pre-key': { '7': null } });

    expect(store.data.has('user-1/pre-key-7')).toBe(false);
    expect(await state.keys.get('pre-key', ['7'])).toEqual({ '7': null });
  });

  it('answers null for a key that was never stored', async () => {
    const { state } = await loadAuthState(memoryStore(), 'user-1');

    expect(await state.keys.get('session', ['unknown'])).toEqual({ unknown: null });
  });
});
