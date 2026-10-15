import { describe, expect, it } from 'vitest';

import { isUserMockEnabled, parseEnv } from './env.schema';

/** O mínimo que o processo exige: os segredos, que não têm padrão. Valores inventados. */
const secrets = {
  DATABASE_URL: 'postgresql://app:senha@banco.exemplo:5432/postgres',
  S3_ACCESS_KEY_ID: 'chave-de-exemplo',
  S3_SECRET_ACCESS_KEY: 'segredo-de-exemplo',
  S3_BUCKET: 'files',
};

describe('parseEnv', () => {
  // feliz
  it('fills in every non-secret with a default, so only the secrets need to be written', () => {
    expect(parseEnv(secrets)).toEqual({
      ...secrets,
      NODE_ENV: 'development',
      API_PORT: 3005,
      API_CORS_ORIGIN: 'http://localhost:5005',
      API_LOG_LEVEL: 'log',
      API_RATE_LIMIT_TTL_SECONDS: 60,
      API_RATE_LIMIT: 300,
      API_WEBHOOK_RATE_LIMIT: 12,
      API_TRUST_PROXY_HOPS: 0,
      WHATSAPP_DAILY_LIMIT: 100,
      S3_SIGNED_URL_TTL_SECONDS: 300,
      S3_REGION: 'local',
      S3_FORCE_PATH_STYLE: true,
      ADMIN_CONSOLE_TOKEN: '',
      ADMIN_CONSOLE_TIMEOUT_MS: 4000,
    });
  });

  /* A trava de requisição precisa nascer LIGADA: um padrão ausente faria a API subir sem
     freio em quem nunca ouviu falar da variável. */
  it('starts with the request limit already on, and the webhook tighter than the rest', () => {
    const env = parseEnv(secrets);

    expect(env.API_RATE_LIMIT).toBeGreaterThan(0);
    expect(env.API_WEBHOOK_RATE_LIMIT).toBeLessThan(env.API_RATE_LIMIT);
  });

  /* Confiar em proxy é o que decide QUEM a trava conta; o padrão precisa ser não confiar. */
  it('trusts no proxy by default, so a forged address cannot dodge the limit', () => {
    expect(parseEnv(secrets).API_TRUST_PROXY_HOPS).toBe(0);
  });

  // triste
  /* Mock em produção transforma toda requisição sem cabeçalho na pessoa fixa — que entra
     sem passar pelo login. O processo recusa subir. */
  it('refuses to start with the development identity turned on in production', () => {
    expect(() => parseEnv({ ...secrets, NODE_ENV: 'production', USER_MOCK: 'true' })).toThrow(
      /USER_MOCK/,
    );
  });

  it('refuses an admin-console address that is not a URL', () => {
    expect(() => parseEnv({ ...secrets, ADMIN_CONSOLE_URL: 'nao-e-url' })).toThrow(
      /ADMIN_CONSOLE_URL/,
    );
  });

  // feliz
  it('turns the development identity on outside production and off in production', () => {
    expect(isUserMockEnabled(parseEnv(secrets))).toBe(true);
    expect(isUserMockEnabled(parseEnv({ ...secrets, NODE_ENV: 'production' }))).toBe(false);
    expect(isUserMockEnabled(parseEnv({ ...secrets, USER_MOCK: 'false' }))).toBe(false);
  });

  it('reads the port that arrives as text, which is how the environment delivers it', () => {
    expect(parseEnv({ ...secrets, API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  /* O banco de teste é opcional: sem ele o sistema sobe, só os testes E2E não rodam. */
  it('treats the test database as optional', () => {
    expect(parseEnv(secrets).TEST_DATABASE_URL).toBeUndefined();
    expect(parseEnv({ ...secrets, TEST_DATABASE_URL: 'postgresql://t' }).TEST_DATABASE_URL).toBe(
      'postgresql://t',
    );
  });

  // triste
  /* Segredo não tem padrão razoável. Subir sem ele adiaria a falha até a primeira gravação,
     quando o motivo já não estaria à vista. */
  it('refuses to start when a secret is missing, naming it', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  /* Apontar o server para um banco que não é Postgres falharia muito depois, com uma
     mensagem da biblioteca que não ajuda ninguém. */
  it('refuses a connection string that is not Postgres', () => {
    expect(() => parseEnv({ ...secrets, DATABASE_URL: './data/app.db' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...secrets, DATABASE_URL: 'mysql://x/y' })).toThrow(/DATABASE_URL/);
  });

  it('refuses a port out of range, naming the variable', () => {
    expect(() => parseEnv({ ...secrets, API_PORT: '0' })).toThrow(/API_PORT/);
    expect(() => parseEnv({ ...secrets, API_PORT: '99999' })).toThrow(/API_PORT/);
  });

  /* Link assinado eterno deixa de ser "baixe agora" e vira um endereço público. */
  it('refuses a signed url lifetime longer than an hour', () => {
    expect(() => parseEnv({ ...secrets, S3_SIGNED_URL_TTL_SECONDS: '7200' })).toThrow(
      /S3_SIGNED_URL_TTL_SECONDS/,
    );
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => parseEnv({ ...secrets, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  // feliz
  /* O provedor é só o endereço: no Supabase, o caminho do S3 e o bucket no caminho. */
  it('reads the S3 endpoint and turns path-style on by default', () => {
    const env = parseEnv({ ...secrets, S3_ENDPOINT: 'http://storage.exemplo:8001/storage/v1/s3' });

    expect(env.S3_ENDPOINT).toBe('http://storage.exemplo:8001/storage/v1/s3');
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  // triste
  it('refuses to start without the S3 key, saying its name', () => {
    expect(() => parseEnv({ ...secrets, S3_ACCESS_KEY_ID: undefined })).toThrow(/S3_ACCESS_KEY_ID/);
  });
});
