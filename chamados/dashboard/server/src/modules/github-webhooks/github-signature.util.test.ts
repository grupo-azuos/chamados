import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { isValidGithubSignature } from './github-signature.util';

const SECRET = 'segredo-de-teste-bem-comprido';
const body = Buffer.from('{"action":"closed","issue":{"number":85}}');

function sign(payload: Buffer, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

describe('isValidGithubSignature', () => {
  // feliz
  it('accepts the signature GitHub computes over the exact bytes', () => {
    expect(isValidGithubSignature(SECRET, body, sign(body))).toBe(true);
  });

  // triste
  it('refuses a signature made with another secret', () => {
    expect(isValidGithubSignature(SECRET, body, sign(body, 'outro-segredo-qualquer'))).toBe(false);
  });

  // triste
  it('refuses a body changed after it was signed', () => {
    const changed = Buffer.from('{"action":"closed","issue":{"number":86}}');
    expect(isValidGithubSignature(SECRET, changed, sign(body))).toBe(false);
  });

  // triste
  it('refuses a missing, old-format or truncated header', () => {
    expect(isValidGithubSignature(SECRET, body, undefined)).toBe(false);
    expect(isValidGithubSignature(SECRET, body, 'sha1=abc')).toBe(false);
    expect(isValidGithubSignature(SECRET, body, sign(body).slice(0, 20))).toBe(false);
  });
});
