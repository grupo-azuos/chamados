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

/**
 * Bases de manutenção, em ordem: o Postgres comum (homo) tem `postgres`; o gerenciado da
 * DigitalOcean (prod) não tem `postgres`, só `defaultdb`.
 */
const MAINTENANCE_DATABASES = ['postgres', 'defaultdb'] as const;

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

/** Conecta na base de manutenção; `null` quando ela não existe neste servidor. */
async function connectMaintenance(
  url: string,
  maintenanceDb: string,
  sslCa?: string,
): Promise<Client | null> {
  const maintenance = new URL(url);
  maintenance.pathname = `/${maintenanceDb}`;

  const admin = new Client({
    ...connectionOptions(maintenance.toString(), sslCa),
    connectionTimeoutMillis: 5000,
  });

  try {
    await admin.connect();
    return admin;
  } catch (error: unknown) {
    await admin.end().catch(() => undefined);
    if (errorCode(error) === DATABASE_MISSING) return null;
    throw error;
  }
}

async function createDatabaseViaMaintenance(
  url: string,
  dbName: string,
  sslCa?: string,
): Promise<void> {
  for (const maintenanceDb of MAINTENANCE_DATABASES) {
    const admin = await connectMaintenance(url, maintenanceDb, sslCa);
    if (!admin) continue;

    try {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      new Logger('DatabaseBootstrap').log(`Created database "${dbName}" via /${maintenanceDb}.`);
      return;
    } finally {
      await admin.end();
    }
  }

  throw Object.assign(
    new Error(
      `No maintenance database (${MAINTENANCE_DATABASES.join(', ')}) to create "${dbName}"`,
    ),
    { code: DATABASE_MISSING },
  );
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
 * Conecta temporariamente na base de manutenção (/postgres, ou /defaultdb na DigitalOcean)
 * para executar o CREATE DATABASE.
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
