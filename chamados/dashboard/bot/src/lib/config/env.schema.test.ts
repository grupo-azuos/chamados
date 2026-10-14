import { describe, expect, it } from 'vitest';

import { parseBotEnv } from './env.schema.js';

const valid = { BOT_API_TOKEN: 't'.repeat(32), BOT_SESSION_KEY: 'a'.repeat(64) };

describe('parseBotEnv', () => {
  // feliz
  it('fills the defaults when only the secrets are given', () => {
    expect(parseBotEnv(valid)).toMatchObject({
      BOT_HOST: '127.0.0.1',
      BOT_PORT: 4005,
      BOT_DATA_DIR: './data',
      BOT_LOG_LEVEL: 'info',
      BOT_INBOUND_LIMIT: 20,
      BOT_INBOUND_WINDOW_MINUTES: 10,
    });
  });

  it('reads the port from text, as environment variables come', () => {
    expect(parseBotEnv({ ...valid, BOT_PORT: '4000' }).BOT_PORT).toBe(4000);
  });

  // triste
  it('refuses to start without the secrets', () => {
    expect(() => parseBotEnv({})).toThrow();
  });

  /* Token curto é token adivinhável — e quem o tem manda mensagem pelo WhatsApp dos outros. */
  it('refuses a short API token', () => {
    expect(() => parseBotEnv({ ...valid, BOT_API_TOKEN: 'short' })).toThrow(/at least 32/);
  });

  it('refuses a session key that is not 32 bytes in hexadecimal', () => {
    expect(() => parseBotEnv({ ...valid, BOT_SESSION_KEY: 'zz'.repeat(32) })).toThrow();
    expect(() => parseBotEnv({ ...valid, BOT_SESSION_KEY: 'a'.repeat(62) })).toThrow();
  });
});
