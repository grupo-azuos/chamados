import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { violations } from './production-contract.mjs';

const repository = join(dirname(fileURLToPath(import.meta.url)), '..');
const KOMODO_TOML = readFileSync(join(repository, '.komodo/komodo.toml'), 'utf8');
const DOCKERFILE = readFileSync(join(repository, 'chamados/dashboard/docker/dockerfile'), 'utf8');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'azuos-production-rule-'));
  const write = (path, content) => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  write('production.json', JSON.stringify({ stage: 'mvp', database: 'sqlite', production_deploy_enabled: false }));
  write('chamados/dashboard/server/src/lib/http/api-version.ts', 'VersioningType.URI; API-Version');
  write('chamados/dashboard/server/src/main.ts', 'packageVersion(); setupOpenApiDocs(app, document);');
  write('chamados/dashboard/server/src/lib/http/openapi-document.ts', 'PUBLISHED_MAJORS; docs/v${major}-json; filter: true');
  write('chamados/dashboard/docker/caddy/caddyfile', ':8080 {\n respond 200\n}\n');
  write('chamados/dashboard/docker/compose.yml', 'healthcheck:\nresources:\nlimits:\nmemory:\ncpus:\nstop_grace_period:\nazuos-edge\n./caddy/caddyfile\n- VALKEY_KEY_PREFIX=${APP_NAME:?}:${DEPLOY_ENV:?}\nazuos.version: ${APP_VERSION:?}\n');
  write('.komodo/komodo.toml', KOMODO_TOML);
  write('chamados/dashboard/docker/dockerfile', DOCKERFILE);
  write('chamados/dashboard/server/package.json', JSON.stringify({ dependencies: {}, scripts: { build: 'rspack build -c rspack.config.ts' } }));
  write('chamados/dashboard/client/package.json', JSON.stringify({ scripts: { build: 'tsc --noEmit && rsbuild build' } }));
  write('chamados/dashboard/docker/komodo.sh', 'auth/approle/login; docker stack config --skip-interpolation\nSTACK_NAME="${DEPLOY_ENV}_${APP_NAME}"\nAPP_VERSION="1.0.0"\n--env APP_VERSION\n');
  /* A versão única (release-standard): script, trava do pre-push e label no deploy. */
  write('scripts/release.mjs', '');
  write('chamados/dashboard/scripts/git/release-guard.sh', '');
  write('chamados/dashboard/.husky/pre-push', 'sh chamados/dashboard/scripts/git/release-guard.sh\nsh chamados/dashboard/scripts/git/branch-guard.sh push\n');
  return { root, write, dispose: () => rmSync(root, { recursive: true }) };
}

test('accepts the versioned API and canonical lowercase caddy location', () => {
  const project = fixture();
  try { assert.deepEqual(violations(project.root), []); } finally { project.dispose(); }
});

test('rejects a caddy filename containing uppercase letters', () => {
  const project = fixture();
  try {
    renameSync(join(project.root, 'chamados/dashboard/docker/caddy/caddyfile'), join(project.root, 'chamados/dashboard/docker/caddy', 'caddyfile'.replace('c', 'C')));
    assert.ok(violations(project.root).some((error) => error.includes('entirely lowercase')));
  } finally { project.dispose(); }
});

test('rejects caddy config placed directly inside docker instead of docker/caddy', () => {
  const project = fixture();
  try {
    renameSync(join(project.root, 'chamados/dashboard/docker/caddy/caddyfile'), join(project.root, 'chamados/dashboard/docker/caddyfile'));
    assert.ok(violations(project.root).some((error) => error.includes('chamados/dashboard/docker/caddy/caddyfile')));
  } finally { project.dispose(); }
});

test('rejects an API without URI versioning and version headers', () => {
  const project = fixture();
  try {
    project.write('chamados/dashboard/server/src/lib/http/api-version.ts', 'unversioned');
    assert.ok(violations(project.root).some((error) => error.includes('URI versioning')));
  } finally { project.dispose(); }
});

test('rejects an extra caddy config outside the caddy directory', () => {
  const project = fixture();
  try {
    project.write('chamados/dashboard/docker/extra.caddyfile', ':8080 {}');
    assert.ok(violations(project.root).some((error) => error.includes('All Caddy configs belong')));
  } finally { project.dispose(); }
});

test('rejects the postgres.js package, even in the MVP', () => {
  const project = fixture();
  try {
    project.write('chamados/dashboard/server/package.json', JSON.stringify({ dependencies: { postgres: '^3.4.9' } }));
    assert.ok(violations(project.root).some((error) => error.includes('always pg')));
  } finally { project.dispose(); }
});

test('rejects importing postgres.js or the postgres-js Drizzle driver', () => {
  const project = fixture();
  try {
    project.write('chamados/dashboard/server/src/lib/db/db.module.ts', "import { drizzle } from 'drizzle-orm/postgres-js';");
    assert.ok(violations(project.root).some((error) => error.includes('never postgres.js')));
  } finally { project.dispose(); }
});

const GUARDED_CONTROLLER = "@Controller('shared-events')\nclass C {\n  @Post()\n  @UseGuards(SharedEventTokenGuard)\n  receive() {}\n}";
const VERIFIER = "export const SYSTEM_AUDIENCE = 'system:paralegal';\nconst c = 'app:shared-api';\njwtVerify(t, k, { algorithms: ['EdDSA'], maxTokenAge: '5m' });";
const REPOSITORY = 'sharedEvents.insert().onConflictDoNothing();';

function withReceiver(project, overrides = {}) {
  const parts = { controller: GUARDED_CONTROLLER, verifier: VERIFIER, repository: REPOSITORY, dependencies: { jose: '^6.0.0' }, ...overrides };
  project.write('chamados/dashboard/server/package.json', JSON.stringify({ dependencies: parts.dependencies }));
  project.write('chamados/dashboard/server/src/modules/shared-events/controller/shared-events.controller.ts', parts.controller);
  project.write('chamados/dashboard/server/src/lib/shared-api/shared-event-token.verifier.ts', parts.verifier);
  project.write('chamados/dashboard/server/src/modules/shared-events/repository/shared-events.repository.ts', parts.repository);
}

test('accepts the MVP without a shared events receiver', () => {
  const project = fixture();
  try { assert.ok(!violations(project.root).some((error) => error.includes('shared events'))); } finally { project.dispose(); }
});

test('accepts a receiver that follows the whole standard', () => {
  const project = fixture();
  try {
    withReceiver(project);
    assert.deepEqual(violations(project.root), []);
  } finally { project.dispose(); }
});

test('rejects a shared events delivery route without the machine token guard', () => {
  const project = fixture();
  try {
    withReceiver(project, { controller: "@Controller('shared-events')\nclass C {\n  @Post()\n  receive() {}\n}" });
    assert.ok(violations(project.root).some((error) => error.includes('SharedEventTokenGuard')));
  } finally { project.dispose(); }
});

test('rejects a verifier that keeps the template audience or accepts other algorithms', () => {
  const project = fixture();
  try {
    withReceiver(project, { verifier: "export const SYSTEM_AUDIENCE = 'system:template';\njwtVerify(t, k, {});" });
    const errors = violations(project.root);
    assert.ok(errors.some((error) => error.includes('this app slug')));
    assert.ok(errors.some((error) => error.includes('EdDSA')));
  } finally { project.dispose(); }
});

test('rejects a receiver without jose or without the idempotent store', () => {
  const project = fixture();
  try {
    withReceiver(project, { dependencies: {}, repository: 'sharedEvents.insert();' });
    const errors = violations(project.root);
    assert.ok(errors.some((error) => error.includes('jose')));
    assert.ok(errors.some((error) => error.includes('idempotently')));
  } finally { project.dispose(); }
});
