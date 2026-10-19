import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createProtection } from './protection-rules.mjs';
import { protectionDecision } from './protect-paths.mjs';

function withProtection(callback) {
  const root = mkdtempSync(join(tmpdir(), 'claude-protection-'));
  const lists = join(root, 'rules');
  mkdirSync(lists);
  writeFileSync(join(lists, 'protected-auth.txt'), '^app/auth/\n');
  writeFileSync(join(lists, 'protected-structure.txt'), '^CLAUDE\\.md$\n');
  writeFileSync(join(lists, 'protected-auth-deps.txt'), '^passport$\n^@nestjs/passport$\n');
  try {
    callback({ root, lists, protection: createProtection(root, lists) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('allows feature edits and blocks protected relative and absolute paths', () => {
  withProtection(({ root, protection }) => {
    // feliz: arquivos comuns não dependem de autorização de estrutura.
    assert.equal(protection.checkFile('app/features/client.mjs'), null);
    // triste: caminho relativo não pode escapar da mesma regra do caminho absoluto.
    assert.match(protection.checkFile('CLAUDE.md'), /protegida/);
    assert.match(protection.checkFile(join(root, 'app/auth/new-file.mjs')), /auth-forward/);
  });
});

test('blocks edits through symbolic link aliases to protected files', (context) => {
  if (process.platform === 'win32')
    return context.skip('Symbolic links require privileges on Windows');
  withProtection(({ root, protection }) => {
    writeFileSync(join(root, 'CLAUDE.md'), '# Rules');
    symlinkSync(join(root, 'CLAUDE.md'), join(root, 'alias.md'));
    // triste: a proteção olha também para o destino real do link.
    assert.match(protection.checkFile('alias.md'), /protegida/);
    symlinkSync(join(root, 'app/auth/new-file.mjs'), join(root, 'new-alias.mjs'));
    assert.match(protection.checkFile('new-alias.mjs'), /auth-forward/);
  });
});

test('fails closed when a protection list is missing or malformed', () => {
  withProtection(({ root, lists }) => {
    rmSync(join(lists, 'protected-auth.txt'));
    // triste: ausência de arquivo nunca vira uma lista de permissões vazia.
    assert.throws(() => createProtection(root, lists), /Cannot load/);
    writeFileSync(join(lists, 'protected-auth.txt'), '[invalid');
    assert.throws(() => createProtection(root, lists), /Cannot load/);
  });
});

test('detects protected dependencies including scoped and versioned packages', () => {
  withProtection(({ protection }) => {
    // feliz: instalação comum continua permitida.
    assert.equal(protection.checkCommand('npm install date-fns'), null);
    // triste: versão e aspas não escondem a biblioteca protegida.
    assert.match(protection.checkCommand('npm i "passport@0.7"'), /autenticação/);
    assert.match(protection.checkCommand('pnpm add @nestjs/passport@11'), /autenticação/);
    assert.equal(protection.checkCommand('npm install date-fns && echo passport'), null);
  });
});

test('inspects every file in a multi-edit event and notebook paths', () => {
  withProtection(({ protection }) => {
    // triste: um arquivo permitido não isenta outro arquivo do mesmo evento.
    assert.match(
      protectionDecision(
        { edits: [{ file_path: 'app/ok.mjs' }, { file_path: 'CLAUDE.md' }] },
        protection,
      ),
      /protegida/,
    );
    assert.match(protectionDecision({ notebook_path: 'CLAUDE.md' }, protection), /protegida/);
  });
});

test('returns blocking exit code when the CLI receives malformed input', () => {
  const root = mkdtempSync(join(tmpdir(), 'claude-hook-input-'));
  try {
    const cli = fileURLToPath(new URL('./protect-paths.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [cli], {
      cwd: root,
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      input: '{invalid',
      encoding: 'utf8',
    });
    // triste: erro no protocolo do hook é informado, não convertido em sucesso.
    assert.equal(result.status, 2);
    assert.match(result.stderr, /bloqueada/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('enforces configured rules through the real CLI in a non-admin project', () => {
  withProtection(({ root, lists }) => {
    const destination = join(root, 'chamados/dashboard/scripts/git');
    mkdirSync(destination, { recursive: true });
    ['protected-auth.txt', 'protected-structure.txt', 'protected-auth-deps.txt'].forEach((name) => {
      writeFileSync(join(destination, name), readFileSync(join(lists, name), 'utf8'));
    });
    const cli = fileURLToPath(new URL('./protect-paths.mjs', import.meta.url));
    const invoke = (path) =>
      spawnSync(process.execPath, [cli], {
        cwd: root,
        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
        input: JSON.stringify({ tool_input: { file_path: path } }),
        encoding: 'utf8',
      });
    // feliz: a configuração da aplicação real permite a edição comum.
    assert.equal(invoke('app/features/allowed.mjs').status, 0);
    // triste: o mesmo ponto de entrada recusa arquivo protegido.
    assert.equal(invoke('CLAUDE.md').status, 2);
  });
});
