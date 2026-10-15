#!/usr/bin/env node
/**
 * PROMOVE O SUPER-ADMIN — o único caminho para ele existir.
 *
 *   npm run superadmin:promote -- pessoa@azuoscontabil.com.br
 *   npm run superadmin:promote -- pessoa@azuoscontabil.com.br --remove
 *
 * O super-admin vê e altera todas as telas e é quem libera os módulos de cada pessoa. Por isso
 * não existe botão para isso: quem roda este comando já tem o `.env` do servidor — e, com ele,
 * o banco inteiro. Uma tela que promovesse super-admin seria a porta mais valiosa do sistema
 * ao alcance de qualquer sessão.
 *
 * A pessoa precisa entrar pelo admin-console como qualquer outra: o comando não cria conta,
 * só diz que AQUI ela manda em tudo. O e-mail é obrigatório — escolher "o primeiro da lista"
 * por conta própria promoveria quem ninguém pediu.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const SERVER_ENV_PATH = resolve(process.cwd(), 'server', '.env');
const ROOT_ENV_PATH = resolve(process.cwd(), '.env');
const envPath = existsSync(SERVER_ENV_PATH) ? SERVER_ENV_PATH : ROOT_ENV_PATH;

function readDatabaseUrl() {
  if (!existsSync(envPath)) {
    console.error(`❌ Arquivo de ambiente não encontrado em: ${envPath}`);
    process.exit(1);
  }

  const match = readFileSync(envPath, 'utf-8').match(/^DATABASE_URL=(.+)$/m);
  if (!match?.[1]) {
    console.error('❌ Variável DATABASE_URL não encontrada no arquivo .env');
    process.exit(1);
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function readArguments() {
  const args = process.argv.slice(2);
  const email = args.find((arg) => !arg.startsWith('--'))?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('❌ Informe o e-mail: npm run superadmin:promote -- pessoa@empresa.com.br');
    process.exit(1);
  }

  return { email, remove: args.includes('--remove') };
}

async function main() {
  const { email, remove } = readArguments();
  const dbUrl = readDatabaseUrl();
  const sql = postgres(dbUrl, {
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : 'require',
    max: 1,
  });

  try {
    if (remove) {
      const removed = await sql`DELETE FROM super_admins WHERE lower(user_email) = ${email} RETURNING id`;
      console.log(removed.length ? `✅ ${email} deixou de ser super-admin.` : `ℹ️ ${email} não era super-admin.`);
      return;
    }

    await sql`
      INSERT INTO super_admins (user_email) VALUES (${email})
      ON CONFLICT (user_email) DO NOTHING
    `;
    console.log(`✅ ${email} agora é super-admin: vê e altera todas as telas e libera os módulos.`);
    console.log('💡 A pessoa precisa ter acesso ao sistema chamados no admin-console para entrar.');
  } catch (error) {
    const missingTable = String(error?.message ?? '').includes('super_admins');
    console.error(
      missingTable
        ? '❌ A tabela super_admins ainda não existe. Suba o servidor uma vez (npm run dev) para aplicar as migrations.'
        : `❌ Erro ao gravar no banco: ${error?.message ?? error}`,
    );
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
