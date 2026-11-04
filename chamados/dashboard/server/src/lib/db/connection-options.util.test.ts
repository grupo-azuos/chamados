import { describe, expect, it } from 'vitest';
import { connectionOptions } from './connection-options.util';

describe('PostgreSQL TLS connection options', () => {
  it('preserves URL policy when no explicit CA is configured', () => {
    const url = 'postgresql://user:secret@db.internal/apps?sslmode=require';
    expect(connectionOptions(url)).toEqual({ connectionString: url });
  });
  it('uses the configured CA and prevents URL parameters from overriding verification', () => {
    const options = connectionOptions(
      'postgresql://user:secret@db.internal/apps?sslmode=no-verify&sslrootcert=wrong&application_name=example',
      'PEM\\nSECOND',
    );
    const url = new URL(options.connectionString!);
    expect(url.searchParams.has('sslmode')).toBe(false);
    expect(url.searchParams.has('sslrootcert')).toBe(false);
    expect(url.searchParams.get('application_name')).toBe('example');
    expect(options.ssl).toEqual({ ca: 'PEM\nSECOND', rejectUnauthorized: true });
  });
});
