import { join, resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool, type PoolConfig } from 'pg';

import { type Database } from './db.type';
import { drizzleSchema } from './drizzle-schema';

/**
 * A pasta `server/`, calculada a partir DESTE arquivo — e não do diretório em que o processo
 * foi iniciado.
 *
 * O mesmo server sobe de lugares diferentes: `npm run dev` roda dentro de `server/`, o Docker
 * roda `node server/dist/main.js` da raiz, e os seeds rodam da raiz do workspace. As
 * migrations precisam ser achadas nos três casos.
 *
 * `src/lib/db` e `dist/lib/db` ficam à mesma distância de `server/`, então a conta vale para
 * o código-fonte e para o build.
 */
export const SERVER_ROOT = resolve(__dirname, '..', '..', '..');

/** As migrations versionadas, geradas por `npm run db:generate`. */
export const MIGRATIONS_FOLDER = join(SERVER_ROOT, 'drizzle');

/**
 * Onde fica a lista de migrations aplicadas — a mesma de `drizzle.config.ts`. O banco é
 * compartilhado com os outros sistemas da casa, e a lista padrão do Drizzle já é de outro.
 */
export const MIGRATIONS_SCHEMA = 'drizzle';
export const MIGRATIONS_TABLE = '__chamados_migrations';

/**
 * O schema deste sistema, também como caminho de busca da conexão: as tabelas são declaradas
 * com o schema (`chamadosSchema`), mas os scripts com SQL à mão (seed, truncate dos testes)
 * escrevem só `tickets` — e assim acham a tabela daqui, e não a de outro sistema.
 */
export const DATABASE_SCHEMA = 'chamados';

/**
 * Como o pool conversa com o Postgres — e por que é o pool do `pg` (node-postgres).
 *
 * O banco de produção fica atrás do pooler do Supabase em modo transação (porta 6543), que empresta
 * uma conexão do banco por consulta e a devolve ao fim dela. O driver anterior (`postgres`), com
 * todas as conexões ocupadas, EMENDAVA a consulta seguinte numa conexão em uso, sem esperar a
 * anterior — e não tem como desligar isso. As emendadas ficavam sem resposta (ClientRead) e as
 * telas travavam para sempre. O pool do `pg` faz uma consulta por conexão: a excedente espera na
 * fila do próprio servidor, e o banco nunca recebe mais consultas simultâneas do que o tamanho
 * do pool. O `pg` também não prepara consulta (o Drizzle não dá nome a elas), que é o que o
 * modo transação exige.
 */
export function poolOptionsFor(url: string, poolSize = 5): PoolConfig {
  return {
    connectionString: url,
    max: poolSize,
    idleTimeoutMillis: 60_000,
    maxLifetimeSeconds: 30 * 60,
    connectionTimeoutMillis: 10_000,
  };
}

export type OpenDatabaseOptions = {
  url: string;
  poolSize?: number;
};

export type OpenDatabase = {
  db: Database;
  close: () => Promise<void>;
};

/**
 * Conecta no Postgres e aplica as migrations pendentes.
 *
 * É a ÚNICA porta para o banco: o `DbModule`, os seeds e os testes E2E passam por aqui.
 */
export async function openDatabase(
  optionsOrUrl: string | OpenDatabaseOptions,
): Promise<OpenDatabase> {
  const options: OpenDatabaseOptions =
    typeof optionsOrUrl === 'string' ? { url: optionsOrUrl } : optionsOrUrl;
  const { url, poolSize = 5 } = options;

  await applyMigrations(url);

  const pool = new Pool(poolOptionsFor(url, poolSize));
  /* Erro numa conexão PARADA (o pooler fechou, a rede caiu) chega como evento do pool. Sem este
     ouvinte, o Node derruba o processo inteiro; com ele, a conexão sai do pool e a próxima
     consulta abre outra. */
  pool.on('error', () => undefined);

  return {
    db: drizzle(pool, { schema: drizzleSchema }),
    close: () => pool.end(),
  };
}

/**
 * Conexão própria, de UMA conexão, fechada ao terminar: o pool da aplicação nasce depois e não
 * herda nada daqui. O Drizzle aplica as pendentes numa transação só.
 */
async function applyMigrations(url: string): Promise<void> {
  const pool = new Pool(poolOptionsFor(url, 1));
  pool.on('error', () => undefined);

  try {
    await migrate(drizzle(pool), {
      migrationsFolder: MIGRATIONS_FOLDER,
      migrationsSchema: MIGRATIONS_SCHEMA,
      migrationsTable: MIGRATIONS_TABLE,
    });
  } finally {
    await pool.end();
  }
}

/**
 * Esconde a senha da string de conexão, para ela poder ser registrada em log.
 *
 * O log de partida diz em que banco o server conectou — e essa informação é útil o bastante
 * para valer o cuidado de não vazar a credencial junto. Um `.env` errado apontando para o
 * banco de produção é o tipo de coisa que só se percebe olhando essa linha.
 */
export function describeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '') || '(padrão)';

    return `${parsed.host}/${database}`;
  } catch {
    return '(string de conexão ilegível)';
  }
}
