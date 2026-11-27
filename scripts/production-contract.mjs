#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { violations as infraViolations } from './infra-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (project, path) => readFileSync(join(project, path), 'utf8');
const rule = (condition, message) => condition ? [] : [message];

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : files(path);
    return [path];
  });
}

function apiRules(project) {
  const version = read(project, 'chamados/dashboard/server/src/lib/http/api-version.ts');
  const main = read(project, 'chamados/dashboard/server/src/main.ts');
  const docs = read(project, 'chamados/dashboard/server/src/lib/http/openapi-document.ts');
  return [
    ...rule(version.includes('VersioningType.URI') && version.includes('API-Version'), 'Use URI versioning /api/v1 and API-Version from the package version'),
    ...rule(main.includes('packageVersion()') && main.includes('setupOpenApiDocs(app'), 'Publish versioned Swagger using the application version'),
    ...rule(docs.includes('PUBLISHED_MAJORS') && docs.includes('docs/v${major}-json') && docs.includes('filter: true'), 'Swagger needs the version selector and the search box'),
  ];
}

function containerRules(project, compose) {
  const required = ['healthcheck:', 'resources:', 'limits:', 'memory:', 'cpus:', 'stop_grace_period:', 'azuos-edge'];
  const komodo = read(project, 'chamados/dashboard/docker/komodo.sh');
  const toml = read(project, '.komodo/komodo.toml');
  return [
    ...required.filter((token) => !compose.includes(token)).map((token) => `Container contract missing ${token}`),
    ...rule(['[[build]]', '[[stack]]', '[[procedure]]', 'sh docker/komodo.sh'].every((token) => toml.includes(token)), 'Declare Build, Stack and Procedure in the Komodo TOML, with the steps in docker/komodo.sh'),
    ...rule(toml.includes('"--resolve-image", "never"') && toml.includes('"--detach=false"'), 'Deploy through native Swarm updates'),
    ...rule(komodo.includes('auth/approle/login') && komodo.includes('--skip-interpolation'), 'Inject Vault secrets only in the docker/komodo.sh steps, never in the stored stack config'),
    ...rule(!/python|ghcr\.io|docker push/.test(toml + compose + komodo), 'Do not use Python controllers, GHCR or image publishing'),
  ];
}

function caddyRules(project, compose) {
  const directory = join(project, 'chamados/dashboard/docker/caddy');
  const paths = files(join(project, 'chamados/dashboard')).filter((path) => /caddyfile/i.test(basename(path)));
  const names = paths.flatMap((path) => [
    ...rule(basename(path) === basename(path).toLowerCase(), 'Caddy configuration filenames must be entirely lowercase'),
    ...rule(path.startsWith(directory + '/'), 'All Caddy configs belong in chamados/dashboard/docker/caddy/'),
  ]);
  return [
    ...rule(existsSync(join(directory, 'caddyfile')), 'Place the lowercase caddyfile in chamados/dashboard/docker/caddy/caddyfile'),
    ...rule(compose.includes('./caddy/caddyfile') && !/\/etc\/caddy\/[^\s]*[A-Z][^\s]*/.test(compose), 'Compose must use the lowercase docker/caddy/caddyfile path'),
    ...names,
  ];
}

function sourceRules(project) {
  return files(join(project, 'chamados/dashboard/server/src'))
    .filter((path) => path.endsWith('.ts'))
    .flatMap((path) => rule(!/infisical\s+(run|export|login)\b|auth\/approle\/login/.test(readFileSync(path, 'utf8')), 'Do not fetch Vault or Infisical secrets in application code'));
}

function driverRules(project) {
  const pkg = JSON.parse(read(project, 'chamados/dashboard/server/package.json'));
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const imports = files(join(project, 'chamados/dashboard/server'))
    .filter((path) => /\.(ts|mts|cts|js|mjs|cjs)$/.test(path))
    .filter((path) => /from ['"](?:postgres|drizzle-orm\/postgres-js(?:\/[^'"]*)?)['"]/.test(readFileSync(path, 'utf8')))
    .map((path) => `Use pg with drizzle-orm/node-postgres, never postgres.js: ${path}`);
  return [
    ...rule(!declared.postgres, 'PostgreSQL driver is always pg: remove the postgres (postgres.js) package'),
    ...imports,
  ];
}

function databaseRules(project) {
  const policy = JSON.parse(read(project, 'production.json'));
  if (policy.stage === 'mvp') return [];
  const pkg = JSON.parse(read(project, 'chamados/dashboard/server/package.json'));
  const env = read(project, 'chamados/dashboard/server/.env.example');
  const required = ['DATABASE_URL=', 'DATABASE_POOL_SIZE=', 'DATABASE_MIGRATION_URL=', 'VALKEY_URL=', 'ADMIN_CONSOLE_CLIENT_SECRET='];
  const sqlite = files(join(project, 'chamados/dashboard/server/src'))
    .filter((path) => path.endsWith('.ts'))
    .filter((path) => /from ['"](?:better-sqlite3|drizzle-orm\/(?:sqlite-core|better-sqlite3))['"]/.test(readFileSync(path, 'utf8')))
    .map((path) => `Replace the MVP SQLite provider before promotion: ${path}`);
  return [
    ...rule(Boolean(pkg.dependencies?.pg), 'Promotion requires pg, bounded pooling and PostgreSQL migrations'),
    ...rule(existsSync(join(project, 'chamados/dashboard/server/src/lib/db/migrate.cli.ts')), 'Promotion requires a PostgreSQL migration entrypoint'),
    ...required.filter((name) => !env.includes(name)).map((name) => `Document ${name} for production`),
    ...sqlite,
  ];
}

/* A entrega de avisos da shared-api: a rota é dispensada da identidade de pessoa, então a única
   porta dela é o token de máquina. Quem a implementa segue o padrão inteiro — guard, conferência
   do token e gravação idempotente — ou não implementa (no MVP, o caminho responde 404). */
function sharedEventsRules(project) {
  const sources = files(join(project, 'chamados/dashboard/server/src'))
    .filter((path) => path.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(path))
    .map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  const controllers = sources.filter(({ text }) => /@Controller\(\s*['"]shared-events['"]/.test(text));
  if (controllers.length === 0) return [];
  const pkg = JSON.parse(read(project, 'chamados/dashboard/server/package.json'));
  const verifier = sources.find(({ text }) => text.includes('SYSTEM_AUDIENCE') && text.includes('jwtVerify'));
  const unguarded = controllers
    .filter(({ text }) => !/@Post\(\)[\s\S]{0,200}@UseGuards\(SharedEventTokenGuard\)|@UseGuards\(SharedEventTokenGuard\)[\s\S]{0,200}@Post\(\)/.test(text))
    .map(({ path }) => `Guard the shared events delivery with SharedEventTokenGuard: ${path}`);
  return [
    ...unguarded,
    ...rule(Boolean(pkg.dependencies?.jose), 'The shared events delivery verifies the machine token with jose'),
    ...rule(Boolean(verifier), 'Verify the shared events token against SYSTEM_AUDIENCE with jwtVerify'),
    ...rule(!verifier || /SYSTEM_AUDIENCE = 'system:(?!template')[a-z0-9-]+'/.test(verifier.text), "SYSTEM_AUDIENCE must be 'system:<this app slug>'"),
    ...rule(!verifier || ["algorithms: ['EdDSA']", 'maxTokenAge', "'app:shared-api'"].every((token) => verifier.text.includes(token)), 'The shared events token must be EdDSA, at most 5 minutes old and issued to app:shared-api'),
    ...rule(sources.some(({ text }) => text.includes('onConflictDoNothing') && /shared.?events?/i.test(text)), 'Store shared events idempotently, by event id (onConflictDoNothing)'),
  ];
}

export function violations(project) {
  const compose = read(project, 'chamados/dashboard/docker/compose.yml');
  return [...new Set([...apiRules(project), ...containerRules(project, compose), ...infraViolations(project), ...caddyRules(project, compose), ...sourceRules(project), ...driverRules(project), ...databaseRules(project), ...sharedEventsRules(project)])];
}

function main() {
  const errors = violations(root);
  if (errors.length === 0) return;
  console.error(errors.join('\n'));
  /* No hook do Claude Code, só a saída 2 volta para o agente corrigir; no terminal e no CI, 1. */
  process.exitCode = process.argv.includes('--hook') ? 2 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
