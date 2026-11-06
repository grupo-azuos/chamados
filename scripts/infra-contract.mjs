#!/usr/bin/env node
// Contrato de infraestrutura (.claude/rules/infra.md): nomes <ambiente>_<app>, recursos do Komodo,
// namespace do Valkey e imagem sem node_modules. Igual em todos os apps; a base é o template.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENVIRONMENTS = {
  homo: { branch: 'develop', builder: 'homo', swarm: 'homo', server: 'homo' },
  prod: { branch: 'main', builder: 'prod', swarm: 'core-prod', server: 'core' },
};
const RESOURCE = /^\[\[(repo|build|stack|procedure|action)\]\]$/;

const rule = (condition, message) => (condition ? [] : [message]);
const quoted = (value) => value?.replace(/^"|"$/g, '');

/* Lê os recursos do komodo.toml sem dependência: cada bloco [[tipo]] até o próximo. */
function komodoResources(toml) {
  const resources = [];
  for (const line of toml.split('\n')) {
    const kind = RESOURCE.exec(line.trim());
    if (kind) resources.push({ kind: kind[1], text: '' });
    else if (resources.length > 0) resources.at(-1).text += `${line}\n`;
  }
  return resources.map((resource) => ({
    ...resource,
    field: (name) => new RegExp(`^${name.replace('.', '\\.')}\\s*=\\s*(.+)$`, 'm').exec(resource.text)?.[1].trim(),
  }));
}

function resourceRules(resource, app) {
  const name = quoted(resource.field('name')) ?? '';
  const env = name.split('_')[0];
  const target = ENVIRONMENTS[env];
  const label = `${resource.kind} ${name}`;
  if (!target || !name.startsWith(`${env}_${app}`)) {
    return [`Komodo ${label}: name must be <ambiente>_<app> (homo_${app} or prod_${app})`];
  }
  const own = name === `${env}_${app}`;
  const tags = `["context:apps", "env:${env}", "server:${target.server}"]`;
  return [
    ...rule(Boolean(quoted(resource.field('description'))), `Komodo ${label}: describe what the resource does`),
    ...rule(resource.field('tags') === tags, `Komodo ${label}: tags must be ${tags}`),
    ...rule(resource.kind === 'procedure' || resource.field('webhook_enabled') === 'false', `Komodo ${label}: only the Procedure receives the GitHub webhook`),
    ...rule(resource.kind !== 'procedure' || resource.field('webhook_enabled') === 'true', `Komodo ${label}: the Procedure receives the GitHub webhook`),
    ...rule(resource.kind !== 'repo' || (quoted(resource.field('branch')) === target.branch && quoted(resource.field('server')) === target.server), `Komodo ${label}: repo clones ${target.branch} on ${target.server}`),
    ...rule(!['build', 'stack'].includes(resource.kind) || quoted(resource.field('linked_repo')) === `${env}_${app}`, `Komodo ${label}: read the files from the Repo ${env}_${app} (linked_repo)`),
    ...rule(resource.kind !== 'build' || (quoted(resource.field('builder')) === target.builder && quoted(resource.field('image_tag')) === env), `Komodo ${label}: build on the ${target.builder} builder with image_tag ${env}`),
    ...rule(resource.kind !== 'build' || (resource.text.includes(`azuos.app=${app}`) && resource.text.includes(`azuos.environment=${env}`)), `Komodo ${label}: label the image with azuos.app and azuos.environment`),
    ...rule(resource.kind !== 'stack' || (quoted(resource.field('swarm')) === target.swarm && quoted(resource.field('project_name')) === name), `Komodo ${label}: deploy ${name} on the ${target.swarm} swarm`),
    ...rule(resource.kind !== 'procedure' || !own || /name = "Pull"[\s\S]*name = "Build"[\s\S]*name = "Deploy"/.test(resource.text), `Komodo ${label}: stages Pull, Build and Deploy, in this order`),
  ];
}

function komodoRules(toml, app) {
  const resources = komodoResources(toml);
  const names = new Set(resources.map((resource) => `${resource.kind} ${quoted(resource.field('name'))}`));
  const required = Object.keys(ENVIRONMENTS).flatMap((env) => [
    ...['repo', 'build', 'stack', 'procedure'].map((kind) => `${kind} ${env}_${app}`),
    `action ${env}_${app}_rollback`,
  ]);
  return [
    ...rule(Boolean(app), 'Komodo Build image_name must be azuos/<app>'),
    ...required.filter((name) => !names.has(name)).map((name) => `Komodo is missing ${name}`),
    ...resources.flatMap((resource) => resourceRules(resource, app)),
  ];
}

/* O pacote é de quem empacota: server pelo Rspack, client pelo Rsbuild, quando existirem. App de um
   pacote só (a API na raiz da pasta, como o shared-api) conta como server. */
function buildRules(appDir) {
  const manifest = (workspace) => {
    const path = join(appDir, workspace, 'package.json');
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
  };
  const root = manifest('.');
  const single = !manifest('server') && Boolean(root?.dependencies?.['@nestjs/core']);
  const server = (single ? root : manifest('server'))?.scripts?.build;
  /* SvelteKit só existe sobre o Vite (não há SvelteKit no Rsbuild): esse client continua no Vite. */
  const clientManifest = manifest('client');
  const sveltekit = Boolean(clientManifest?.devDependencies?.['@sveltejs/kit'] ?? clientManifest?.dependencies?.['@sveltejs/kit']);
  const client = sveltekit ? undefined : clientManifest?.scripts?.build;
  const serverManifest = single ? root : manifest('server');
  const dependencies = { ...serverManifest?.dependencies, ...serverManifest?.devDependencies };
  const major = (name) => Number(/\d+/.exec(dependencies[name] ?? '')?.[0] ?? NaN);
  return [
    ...rule(!dependencies['nestjs-zod'], 'Validate with Zod directly (createZodDto in lib/http/zod-dto.ts), never nestjs-zod'),
    ...rule(!dependencies.zod || major('zod') >= 4, 'Use Zod 4 or newer'),
    ...rule(!dependencies['@nestjs/core'] || major('@nestjs/core') >= 12, 'Use NestJS 12 or newer'),
    ...rule(server === undefined || /rspack build/.test(server), 'Build the server with Rspack (rspack build)'),
    ...rule(client === undefined || /rsbuild build/.test(client), 'Build the client with Rsbuild (rsbuild build)'),
  ];
}

function dockerRules(appDir) {
  const read = (path) => (existsSync(join(appDir, path)) ? readFileSync(join(appDir, path), 'utf8') : '');
  const dockerfile = read('docker/dockerfile');
  const runtime = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
  const komodo = read('docker/komodo.sh');
  const compose = read('docker/compose.yml');
  return [
    ...rule(komodo.includes('STACK_NAME="${DEPLOY_ENV}_${APP_NAME}"'), 'docker/komodo.sh must name the stack <ambiente>_<app>'),
    ...rule(!/VALKEY_KEY_PREFIX(?!=\$\{APP_NAME:\?\}:\$\{DEPLOY_ENV:\?\})/.test(compose), 'Valkey namespace is <app>:<ambiente>, set in docker/compose.yml as VALKEY_KEY_PREFIX=${APP_NAME:?}:${DEPLOY_ENV:?}'),
    /* `node_modules` inteiro não entra; só o do estágio `externals`, que instala os poucos pacotes
       que não cabem no pacote (worker, dados no disco, ESM carregado por import()). */
    ...rule(
      (runtime.match(/^COPY --from=(\S+)[^\n]*\/node_modules\s+(?:\S+\/)?node_modules\s*$/gm) ?? []).every((line) => line.startsWith('COPY --from=externals ')),
      'The runtime image carries the Rspack bundle, not node_modules (only native modules one by one, or the externals stage)',
    ),
  ];
}

/* No Zod 4 o `.default()` vale dentro do `.optional()`: o `.partial()` de um schema de criação faria
   a edição gravar os valores padrão por cima do que está salvo. Edição usa `partialUpdate`. */
function schemaRules(appDir) {
  const sources = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return ['node_modules', 'dist', '.git'].includes(entry.name) ? [] : sources(path);
      return /\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name) ? [path] : [];
    });
  return sources(appDir)
    .filter((path) => /\b[A-Za-z]+Schema(?:\.omit\([^)]*\))?\.partial\(\)/.test(readFileSync(path, 'utf8')))
    .map((path) => `Use partialUpdate(schema) instead of schema.partial() for update schemas (Zod 4 applies defaults inside optional): ${path}`);
}

export function violations(project) {
  const toml = readFileSync(join(project, '.komodo/komodo.toml'), 'utf8');
  const app = /image_name = "azuos\/([a-z0-9-]+)"/.exec(toml)?.[1] ?? '';
  const appDir = join(project, /build_path = "([^"]+)"/.exec(toml)?.[1] ?? '.');
  return [...new Set([...komodoRules(toml, app), ...dockerRules(appDir), ...buildRules(appDir), ...schemaRules(appDir)])];
}

function main() {
  const errors = violations(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  if (errors.length === 0) return;
  console.error(errors.join('\n'));
  /* No hook do Claude Code, só a saída 2 volta para o agente corrigir; no terminal e no CI, 1. */
  process.exitCode = process.argv.includes('--hook') ? 2 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
