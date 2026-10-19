import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { collectDocumentation, collectTextFiles, readEditedPaths } from './project-files.mjs';

test('collects source files while skipping generated directories and symbolic link cycles', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'design-files-'));
  try {
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'src/example.ts'), 'export const value = 1;');
    writeFileSync(join(root, 'node_modules/ignored.ts'), 'ignored');
    if (process.platform !== 'win32') symlinkSync(root, join(root, 'src/cycle'));
    // feliz: arquivo real encontrado; triste: ciclo e dependências não entram na varredura.
    assert.deepEqual(
      collectTextFiles(root, (path) => path.endsWith('.ts')),
      [join(root, 'src/example.ts')],
    );
    if (process.platform === 'win32') context.diagnostic('Symbolic link check runs on Unix');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('finds documentation outside covered source trees without duplicating source docs', () => {
  const root = mkdtempSync(join(tmpdir(), 'design-docs-'));
  try {
    mkdirSync(join(root, 'docs'));
    mkdirSync(join(root, 'src/docs'), { recursive: true });
    writeFileSync(join(root, 'docs/guide.md'), 'guide');
    writeFileSync(join(root, 'src/docs/covered.md'), 'covered');
    // feliz: o diretório já coberto não é percorrido novamente.
    assert.deepEqual(
      collectDocumentation(root, new Set([join(root, 'src')]), (path) => path.endsWith('.md')),
      [join(root, 'docs/guide.md')],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('normalizes relative and absolute event paths and rejects malformed events', () => {
  const root = join(tmpdir(), 'design-event');
  const absolute = join(root, 'client/second.ts');
  const event = { tool_input: { file_path: 'client/first.ts', edits: [{ file_path: absolute }] } };
  // feliz: uma edição múltipla cobre todos os arquivos da mesma operação.
  assert.deepEqual(readEditedPaths(root, JSON.stringify(event)), [
    join(root, 'client/first.ts'),
    absolute,
  ]);
  // triste: um evento inválido não é tratado como edição aprovada.
  assert.throws(() => readEditedPaths(root, '{invalid'), SyntaxError);
  assert.throws(() => readEditedPaths(root, '{}'), /tool_input/);
});
