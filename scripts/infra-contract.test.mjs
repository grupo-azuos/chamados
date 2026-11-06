import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { violations } from './infra-contract.mjs';

const repository = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOML = readFileSync(join(repository, '.komodo/komodo.toml'), 'utf8');
const APP = /image_name = "azuos\/([a-z0-9-]+)"/.exec(TOML)[1];
const APP_DIR = /build_path = "([^"]+)"/.exec(TOML)[1];

/* Cópia do que o contrato lê (TOML e docker/ e package.json do app), para estragar à vontade. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'azuos-infra-rule-'));
  cpSync(join(repository, '.komodo'), join(root, '.komodo'), { recursive: true });
  cpSync(join(repository, APP_DIR, 'docker'), join(root, APP_DIR, 'docker'), { recursive: true });
  for (const workspace of ['server', 'client', '.']) {
    try {
      cpSync(join(repository, APP_DIR, workspace, 'package.json'), join(root, APP_DIR, workspace, 'package.json'));
    } catch {
      /* app sem esse workspace */
    }
  }
  const write = (path, content) => writeFileSync(join(root, path), content);
  const read = (path) => readFileSync(join(root, path), 'utf8');
  return { root, write, read, dispose: () => rmSync(root, { recursive: true }) };
}

const failsWith = (project, text) => violations(project.root).some((error) => error.includes(text));

test('accepts the repository as it is', () => {
  assert.deepEqual(violations(repository), []);
});

test('rejects Komodo resources outside the <ambiente>_<app> name', () => {
  const project = fixture();
  try {
    project.write('.komodo/komodo.toml', TOML.replaceAll(`homo_${APP}`, `${APP}-homo`));
    assert.ok(failsWith(project, 'name must be <ambiente>_<app>'));
    assert.ok(failsWith(project, `missing repo homo_${APP}`));
  } finally {
    project.dispose();
  }
});

test('rejects a resource without description or with the wrong tags', () => {
  const project = fixture();
  try {
    const repo = TOML.indexOf(`name = "homo_${APP}"`);
    const broken = TOML.slice(0, repo) + TOML.slice(repo).replace(/description = ".*"\n/, '').replace('"server:homo"]', '"server:core"]');
    project.write('.komodo/komodo.toml', broken);
    assert.ok(failsWith(project, `repo homo_${APP}: describe`));
    assert.ok(failsWith(project, `repo homo_${APP}: tags must be`));
  } finally {
    project.dispose();
  }
});

test('rejects a webhook outside the Procedure and a Build that does not read the Repo', () => {
  const project = fixture();
  try {
    project.write('.komodo/komodo.toml', TOML.replace(`builder = "homo"\nlinked_repo = "homo_${APP}"\nwebhook_enabled = false`, 'builder = "homo"\nwebhook_enabled = true'));
    assert.ok(failsWith(project, `build homo_${APP}: only the Procedure`));
    assert.ok(failsWith(project, `build homo_${APP}: read the files from the Repo`));
  } finally {
    project.dispose();
  }
});

test('rejects a stack named outside <ambiente>_<app>', () => {
  const project = fixture();
  try {
    project.write(`${APP_DIR}/docker/komodo.sh`, project.read(`${APP_DIR}/docker/komodo.sh`).replace('STACK_NAME="${DEPLOY_ENV}_${APP_NAME}"', 'STACK_NAME="$APP_NAME-$DEPLOY_ENV"'));
    assert.ok(failsWith(project, 'name the stack <ambiente>_<app>'));
  } finally {
    project.dispose();
  }
});

test('rejects a Valkey namespace typed by hand', (context) => {
  const project = fixture();
  try {
    const compose = project.read(`${APP_DIR}/docker/compose.yml`);
    if (!compose.includes('VALKEY_KEY_PREFIX')) return context.skip('app sem Valkey');
    project.write(`${APP_DIR}/docker/compose.yml`, compose.replace('VALKEY_KEY_PREFIX=${APP_NAME:?}:${DEPLOY_ENV:?}', 'VALKEY_KEY_PREFIX'));
    assert.ok(failsWith(project, 'Valkey namespace is <app>:<ambiente>'));
  } finally {
    project.dispose();
  }
});

test('accepts the node_modules of the externals stage', () => {
  const project = fixture();
  try {
    const dockerfile = project.read(`${APP_DIR}/docker/dockerfile`);
    project.write(`${APP_DIR}/docker/dockerfile`, `${dockerfile}COPY --from=externals /externals/node_modules node_modules\n`);
    assert.ok(!failsWith(project, 'not node_modules'));
  } finally {
    project.dispose();
  }
});

test('rejects nestjs-zod, Zod 3 and NestJS 11 in the server', (context) => {
  const project = fixture();
  try {
    const path = ['server/package.json', 'package.json'].map((file) => `${APP_DIR}/${file}`).find((file) => {
      try {
        return Boolean(JSON.parse(project.read(file)).dependencies?.['@nestjs/core']);
      } catch {
        return false;
      }
    });
    if (!path) return context.skip('app sem servidor Nest');
    const manifest = JSON.parse(project.read(path));
    manifest.dependencies = { ...manifest.dependencies, 'nestjs-zod': '^5.5.0', zod: '^3.23.8', '@nestjs/core': '^11.2.5' };
    project.write(path, JSON.stringify(manifest));
    assert.ok(failsWith(project, 'never nestjs-zod'));
    assert.ok(failsWith(project, 'Zod 4'));
    assert.ok(failsWith(project, 'NestJS 12'));
  } finally {
    project.dispose();
  }
});

test('rejects schema.partial() for update schemas', () => {
  const project = fixture();
  try {
    project.write(`${APP_DIR}/docker/update.schema.ts`, 'export const updateThingSchema = createThingSchema.partial();\n');
    assert.ok(failsWith(project, 'partialUpdate(schema)'));
  } finally {
    project.dispose();
  }
});

test('rejects a runtime image that copies node_modules', () => {
  const project = fixture();
  try {
    const dockerfile = project.read(`${APP_DIR}/docker/dockerfile`);
    project.write(`${APP_DIR}/docker/dockerfile`, `${dockerfile}COPY --from=deps /repo/node_modules node_modules\n`);
    assert.ok(failsWith(project, 'not node_modules'));
  } finally {
    project.dispose();
  }
});
