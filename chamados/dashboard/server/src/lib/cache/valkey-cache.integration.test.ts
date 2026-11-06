import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { type Env } from '../config/env.schema';
import { ValkeyCache } from './valkey-cache';

const caches: ValkeyCache[] = [];
afterEach(() => {
  for (const cache of caches.splice(0)) cache.onApplicationShutdown();
});

function create(prefix: string): ValkeyCache {
  const cache = new ValkeyCache({
    VALKEY_URL: process.env.TEST_VALKEY_URL,
    VALKEY_KEY_PREFIX: prefix,
    VALKEY_TIMEOUT_MS: 1000,
  } as Env);
  caches.push(cache);
  return cache;
}

describe.runIf(Boolean(process.env.TEST_VALKEY_URL))(
  'Valkey integration with isolated namespaces',
  () => {
    it('shares cache within an environment and separates prod from homo', async () => {
      const namespace = `hotfix-${randomUUID()}`;
      const prod = create(`${namespace}:prod`);
      const replica = create(`${namespace}:prod`);
      const homo = create(`${namespace}:homo`);
      expect(await prod.ready()).toBe(true);
      expect(await replica.ready()).toBe(true);
      expect(await homo.ready()).toBe(true);
      expect(await prod.remember('same-key', 2, async () => ({ source: 'prod' }))).toEqual({
        source: 'prod',
      });
      expect(await replica.remember('same-key', 2, async () => ({ source: 'wrong' }))).toEqual({
        source: 'prod',
      });
      expect(await homo.remember('same-key', 2, async () => ({ source: 'homo' }))).toEqual({
        source: 'homo',
      });
    });

    it('does not cache source errors and expires short lived entries', async () => {
      const cache = create(`hotfix-${randomUUID()}:test`);
      expect(await cache.ready()).toBe(true);
      await expect(
        cache.remember('error', 1, async () => {
          throw new Error('source unavailable');
        }),
      ).rejects.toThrow('source unavailable');
      expect(await cache.remember('error', 1, async () => 'recovered')).toBe('recovered');
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(await cache.remember('error', 1, async () => 'fresh')).toBe('fresh');
    });
  },
);
