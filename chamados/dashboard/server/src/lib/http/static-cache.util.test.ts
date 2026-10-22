import { type ServerResponse } from 'node:http';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  IMMUTABLE_CACHE_CONTROL,
  REVALIDATE_CACHE_CONTROL,
  staticCacheControl,
  staticCacheHeaders,
} from './static-cache.util';

const ROOT = join('/repo', 'client', 'dist');

describe('staticCacheControl', () => {
  // feliz
  it('keeps the hashed SvelteKit files for a year without revalidating', () => {
    expect(staticCacheControl(ROOT, join(ROOT, '_app', 'immutable', 'entry', 'start.BxYz12.js'))).toBe(
      IMMUTABLE_CACHE_CONTROL,
    );
    expect(staticCacheControl(ROOT, join(ROOT, '_app', 'immutable', 'assets', '0.Ab12Cd.css'))).toBe(
      IMMUTABLE_CACHE_CONTROL,
    );
  });

  /* O nome destes não muda entre versões: guardados sem revalidar, prenderiam a pessoa na
     tela velha. */
  it('makes the page, the service worker and the files without hash revalidate', () => {
    for (const file of ['index.html', 'service-worker.js', 'favicon.svg', 'manifest.webmanifest']) {
      expect(staticCacheControl(ROOT, join(ROOT, file))).toBe(REVALIDATE_CACHE_CONTROL);
    }
  });

  // triste
  /* É por ele que o SvelteKit descobre a versão nova; imutável, a tela nunca saberia. */
  it('does not freeze the version file, even though it lives under _app', () => {
    expect(staticCacheControl(ROOT, join(ROOT, '_app', 'version.json'))).toBe(REVALIDATE_CACHE_CONTROL);
  });

  /* Só o caminho a partir da raiz do build conta, e não o caminho da máquina. */
  it('ignores an _app/immutable folder above the build root', () => {
    const root = join('/srv', '_app', 'immutable', 'dist');

    expect(staticCacheControl(root, join(root, 'index.html'))).toBe(REVALIDATE_CACHE_CONTROL);
  });

  it('does not trust a file outside the build root (edge case)', () => {
    expect(staticCacheControl(ROOT, join('/repo', '_app', 'immutable', 'x.js'))).toBe(
      REVALIDATE_CACHE_CONTROL,
    );
  });
});

describe('staticCacheHeaders', () => {
  // feliz
  it('writes the Cache-Control on the response it receives', () => {
    const setHeader = vi.fn();
    const response = { setHeader } as unknown as ServerResponse;

    staticCacheHeaders(ROOT)(response, join(ROOT, 'index.html'));

    expect(setHeader).toHaveBeenCalledWith('Cache-Control', REVALIDATE_CACHE_CONTROL);
  });
});
