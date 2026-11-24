import { describe, expect, it } from 'vitest';

import { gitChangeOf } from './github-webhooks.service';

describe('gitChangeOf', () => {
  // feliz
  it('reads a branch created, a push and a branch deleted', () => {
    expect(gitChangeOf('create', { ref_type: 'branch', ref: 'feature/mapa' })).toEqual({
      kind: 'created',
      branch: 'feature/mapa',
      headSha: null,
    });
    expect(gitChangeOf('push', { ref: 'refs/heads/develop', after: 'abc123' })).toEqual({
      kind: 'pushed',
      branch: 'develop',
      headSha: 'abc123',
    });
    expect(gitChangeOf('delete', { ref_type: 'branch', ref: 'feature/mapa' })).toEqual({
      kind: 'deleted',
      branch: 'feature/mapa',
    });
  });

  // triste
  it('ignores tags, the push that deletes and other events', () => {
    expect(gitChangeOf('create', { ref_type: 'tag', ref: 'v1.0.0' })).toBeNull();
    expect(gitChangeOf('push', { ref: 'refs/tags/v1.0.0' })).toBeNull();
    expect(gitChangeOf('push', { ref: 'refs/heads/feature/x', deleted: true })).toBeNull();
    expect(gitChangeOf('issues', {})).toBeNull();
  });
});
