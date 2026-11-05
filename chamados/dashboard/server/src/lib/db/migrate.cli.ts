import { connectionOptions } from './connection-options.util';
import { Logger } from '@nestjs/common';
import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

async function main(): Promise<void> {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url))
    throw new Error('DATABASE_MIGRATION_URL must be the direct PostgreSQL connection');
  const client = new Client({
    ...connectionOptions(url, process.env.DATABASE_SSL_CA),
    connectionTimeoutMillis: 5000,
    statement_timeout: 120000,
    application_name: 'chamados-migrations',
  });
  await client.connect();
  try {
    // Trava de sessão na mesma conexão do migrador, sem passar pelo pooler de transações.
    await client.query('SELECT pg_advisory_lock(hashtext($1))', ['chamados:migrations']);
    await migrate(drizzle(client), {
      migrationsFolder: join(__dirname, '..', '..', '..', 'drizzle'),
      migrationsSchema: 'drizzle',
      migrationsTable: '__chamados_migrations',
    });
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
  const raw = error instanceof Error ? error.message : String(error);
  const reason = raw.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgresql://[REDACTED]');
  new Logger('Migrations').error(
    `Migration failed (${code}: ${reason}); traffic remains on the previous slot.`,
  );
  process.exitCode = 1;
});
