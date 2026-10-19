import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { IDENTIFIED_MESSAGE, MINIMAL_MESSAGE, projectFixture } from './metrics-fixture.mjs';

const CLI = new URL('./validate-metrics.mjs', import.meta.url);

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function invoke(root, args) {
  return spawnSync(process.execPath, [fileURLToPath(CLI), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function withRepository(callback) {
  const root = mkdtempSync(join(tmpdir(), 'project-metrics-'));
  try {
    git(root, ['init', '-q']);
    git(root, ['config', 'user.name', 'Test']);
    git(root, ['config', 'user.email', 'test@example.com']);
    git(root, ['config', 'commit.gpgsign', 'false']);
    git(root, ['commit', '--allow-empty', '-qm', 'Legacy without trailers']);
    mkdirSync(join(root, 'docs'));
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeRegistry(root, data) {
  writeFileSync(join(root, 'docs/project.json'), JSON.stringify(data));
}

test('checks the Git index rather than an unstaged corrected registry', () => {
  withRepository((root) => {
    const data = projectFixture();
    data.participants[0].department = null;
    writeRegistry(root, data);
    git(root, ['add', 'docs/project.json']);
    writeRegistry(root, projectFixture());
    const message = join(root, 'message.txt');
    writeFileSync(message, IDENTIFIED_MESSAGE);
    // triste: salvar no disco sem preparar para commit não basta.
    assert.notEqual(invoke(root, ['--message', message]).status, 0);
    git(root, ['add', 'docs/project.json']);
    // feliz: os dados válidos do índice correspondem ao que será versionado.
    assert.equal(invoke(root, ['--message', message]).status, 0);
  });
});

test('validates adoption, merge attribution and registry removal in history', () => {
  withRepository((root) => {
    writeRegistry(root, projectFixture());
    git(root, ['add', 'docs/project.json']);
    git(root, ['commit', '-qm', IDENTIFIED_MESSAGE]);
    // feliz: histórico anterior à adoção também pode estar no intervalo.
    assert.equal(invoke(root, ['--range', '0'.repeat(40), 'HEAD']).status, 0);
    git(root, ['commit', '--allow-empty', '-qm', '[merge](web): Entrega sem identidade']);
    // triste: merge novo não recebe isenção automática.
    assert.notEqual(invoke(root, ['--range', 'HEAD~1', 'HEAD']).status, 0);
    git(root, ['rm', 'docs/project.json']);
    git(root, ['commit', '-qm', IDENTIFIED_MESSAGE]);
    assert.notEqual(invoke(root, ['--range', 'HEAD', 'HEAD']).status, 0);
  });
});

test('uses each commit registry when identity modes change', () => {
  withRepository((root) => {
    writeRegistry(root, projectFixture());
    git(root, ['add', 'docs/project.json']);
    git(root, ['commit', '-qm', IDENTIFIED_MESSAGE]);
    const data = projectFixture();
    data.privacy = {
      repository_visibility: 'private',
      commit_identity: 'pseudonymous',
      governance_status: 'pending_review',
      purpose: 'internal_metrics',
      controller: null,
      contact: null,
      lawful_basis: null,
      retention_policy: null,
    };
    writeRegistry(root, data);
    git(root, ['add', 'docs/project.json']);
    git(root, ['commit', '-qm', MINIMAL_MESSAGE]);
    // feliz: o modo novo não invalida commits identificados antigos.
    assert.equal(invoke(root, ['--range', '0'.repeat(40), 'HEAD']).status, 0);
  });
});

test('rejects unknown CLI arguments and injects session guidance without personal data', () => {
  const result = invoke(process.cwd(), ['--session-hook']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /metrics-privacy/);
  assert.doesNotMatch(result.stdout, /ana@example.com/);
  assert.notEqual(invoke(process.cwd(), ['--invalid']).status, 0);
});
