import { type OpenAPIObject } from '@nestjs/swagger';
import { describe, expect, it } from 'vitest';

import { onlyMajor, PUBLISHED_MAJORS } from './openapi-document';

function documentWith(paths: string[]): OpenAPIObject {
  return {
    openapi: '3.0.0',
    info: { title: 'API', version: '1.0.0' },
    paths: Object.fromEntries(paths.map((path) => [path, {}])),
  };
}

describe('onlyMajor', () => {
  // feliz
  it('keeps the routes of the version and the unversioned ones, naming the version', () => {
    const document = onlyMajor(
      documentWith(['/api/v1/users', '/api/v2/users', '/api/health']),
      '1',
    );

    expect(Object.keys(document.paths)).toEqual(['/api/v1/users', '/api/health']);
    expect(document.info.title).toBe('API v1');
  });

  // triste
  /* `v1` não pode puxar `v10`: o prefixo é comparado com a barra do fim. */
  it('does not mix a version with another that starts with the same digit', () => {
    const document = onlyMajor(documentWith(['/api/v10/users', '/api/v1/users']), '1');

    expect(Object.keys(document.paths)).toEqual(['/api/v1/users']);
  });
});

describe('PUBLISHED_MAJORS', () => {
  // feliz
  it('publishes the current major first, for the version selector', () => {
    expect(PUBLISHED_MAJORS[0]).toBe('1');
  });
});
