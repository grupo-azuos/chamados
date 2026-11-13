import { Logger } from '@nestjs/common';
import { Client } from 'pg';

import { connectionOptions } from './connection-options.util';

export const DATABASE_MISSING = '3D000';

function extractDatabaseName(url: string): string {
  const target = new URL(url);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName)) {
    throw new Error(`Invalid database name in DATABASE_MIGRATION_URL: ${dbName}`);
  }
  return dbName;
}

async function createDatabaseViaMaintenance(
  url: string,
  dbName: string,
  sslCa?: string,
): Promise<void> {
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';

  const admin = new Client({
    ...connectionOptions(maintenance.toString(), sslCa),
    connectionTimeoutMillis: 5000,
  });

  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    new Logger('DatabaseBootstrap').log(`Created database "${dbName}" via /postgres.`);
  } finally {
    await admin.end();
  }
}

async function probeDatabase(url: string, sslCa?: string): Promise<string | null> {
  const probe = new Client({
    ...connectionOptions(url, sslCa),
    connectionTimeoutMillis: 5000,
  });

  try {
    await probe.connect();
    await probe.query('SELECT 1');
    return null;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as { code: unknown }).code);
    }
    throw error;
  } finally {
    try {
      await probe.end();
    } catch {
      // Ignora falha de encerramento do probe não conectado
    }
  }
}

/**
 * Cria o database da URL se ele não existir (erro 3D000) — o mesmo do `shared-api` e do
 * `admin-console`: cada app da casa tem o PRÓPRIO database, e não um `apps` dividido.
 *
 * Conecta temporariamente na base de manutenção /postgres para executar o CREATE DATABASE.
 * Num banco que já existe, a primeira conexão dá certo e nada mais acontece: a migration de
 * todo dia não precisa de permissão de `CREATE DATABASE`.
 */
export async function ensureDatabase(url: string, sslCa?: string): Promise<boolean> {
  const errorCode = await probeDatabase(url, sslCa);
  if (!errorCode) return false;
  if (errorCode !== DATABASE_MISSING) {
    throw Object.assign(new Error(`Failed to connect to database (code: ${errorCode})`), {
      code: errorCode,
    });
  }

  const dbName = extractDatabaseName(url);
  await createDatabaseViaMaintenance(url, dbName, sslCa);
  return true;
}
