import { describe, expect, it } from 'vitest';

import { publicServiceOrderSchema } from './service-order.schema';

describe('public service order contract', () => {
  // feliz
  it('accepts an issued order with its fingerprint', () => {
    expect(
      publicServiceOrderSchema.safeParse({
        code: 'a'.repeat(64),
        protocol: 'CH-0001',
        version: 1,
        issuedAt: '2026-10-20T12:00:00.000Z',
        statusAtIssue: 'resolved',
        historyCount: 2,
        totalMinutes: null,
        fileHash: 'b'.repeat(64),
        isLatest: true,
        latestVersion: 1,
      }).success,
    ).toBe(true);
  });

  // triste
  it('refuses a fingerprint of the wrong size', () => {
    expect(publicServiceOrderSchema.safeParse({ fileHash: 'curta' }).success).toBe(false);
  });
});
