#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDocumentation, collectTextFiles, readEditedPaths } from './project-files.mjs';

import {
  APPS,
  RULES,
  compareWithBaseline,
  countByKey,
  violationsTouching,
} from './design-rules.mjs';

/**
 * Confere o projeto contra as skills `design-system` e `ui-standards`.
 *
 *   npm run check:design              → reprova se houver violação NOVA (fora da baseline)
 *   node check-design.mjs --all       → lista tudo, inclusive a dívida já conhecida
 *   node check-design.mjs --update    → regrava a baseline (depois de corrigir dívida)
 *   node check-design.mjs --hook      → modo hook do Claude Code (lê o evento no stdin)
 *
 * POR QUE BASELINE: o projeto já nasceu com dívida (componente sem prefixo, cor crua…). Reprovar
 * tudo de uma vez travaria todo PR até a migração inteira acabar; aceitar tudo deixaria a dívida
 * crescer. A baseline congela o que existe: o que já está lá passa, o que é novo reprova, e
 * cada correção encolhe o arquivo.
 *
 * `.mjs` puro, sem `tsx` e sem dependência: roda no CI, no `pre-push` E no hook `PostToolUse`
 * do Claude Code a cada edição — por isso precisa iniciar rápido.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
/** A raiz do repositório: `.claude/hooks/design` → `.claude/hooks` → `.claude` → raiz. */
const REPO_ROOT = join(__dirname, '..', '..', '..');
const BASELINE_FILE = join(__dirname, 'design-baseline.json');

/** O que entra na varredura, relativo à raiz do repositório. */
const SCAN_ROOTS = [...APPS.map((app) => app.src), 'chamados/dashboard/server/src'];
const TEXT_FILE = /\.(svelte|ts|md)$/;

function acceptsFile(path) {
  return TEXT_FILE.test(path);
}

function loadFiles() {
  const covered = new Set(SCAN_ROOTS.map((path) => join(REPO_ROOT, path)));
  const appRoot = APPS[0].src.split('/')[0];
  const sourceFiles = [...covered].flatMap((path) => collectTextFiles(path, acceptsFile));
  const docs = collectDocumentation(join(REPO_ROOT, appRoot), covered, acceptsFile);
  const rootDocs = collectTextFiles(join(REPO_ROOT, 'docs'), acceptsFile);

  return [...new Set([...sourceFiles, ...docs, ...rootDocs])].map((full) => ({
    path: relative(REPO_ROOT, full).split(sep).join('/'),
    content: readFileSync(full, 'utf8'),
  }));
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return {};

  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
}

function saveBaseline(violations) {
  const { added } = compareWithBaseline(violations, loadBaseline());
  if (added.length > 0)
    throw new Error('Cannot increase the design baseline; fix new violations first');
  const counts = countByKey(violations);
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

function report(write, title, violations) {
  write(`\n${title}\n`);
  for (const rule of RULES) {
    const mine = violations.filter((violation) => violation.rule === rule.id);
    if (mine.length === 0) continue;

    write(`\n  ✗ ${rule.id} (${mine.length}) — ${rule.description}\n`);
    for (const violation of mine) {
      const where = violation.line ? `${violation.file}:${violation.line}` : violation.file;
      write(`      ${where}  ${violation.detail}\n`);
    }
  }
}

/** Caminho (relativo à raiz) entra na varredura e tem extensão que alguma regra olha? */
function inScope(relPath) {
  if (!TEXT_FILE.test(relPath)) return false;
  if (SCAN_ROOTS.some((root) => relPath === root || relPath.startsWith(`${root}/`))) return true;

  if (/^docs\/[^/]+\.md$/.test(relPath)) return true;

  return (
    relPath.startsWith(`${APPS[0].src.split('/')[0]}/`) && /(^|\/)docs\/[^/]+\.md$/.test(relPath)
  );
}

/** Só varre o projeto quando algum arquivo editado pertence ao escopo de design. */
function runHook() {
  const paths = readEditedPaths(REPO_ROOT, readFileSync(0, 'utf8'))
    .map((path) => relative(REPO_ROOT, path).split(sep).join('/'))
    .filter(inScope);
  if (paths.length === 0) return;
  const files = loadFiles();
  const violations = RULES.flatMap((rule) => rule.check(files));
  const { added } = compareWithBaseline(violations, loadBaseline());
  const touching = [...new Set(paths.flatMap((path) => violationsTouching(added, path)))];
  if (touching.length === 0) return;
  report(
    (text) => process.stderr.write(text),
    `Design: ${touching.length} violação(ões) nova(s):`,
    touching,
  );
  process.stderr.write('Corrija agora — skill design-system / ui-standards.\n');
  process.exitCode = 2;
}

function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has('--hook')) {
    runHook();

    return;
  }

  const files = loadFiles();
  const violations = RULES.flatMap((rule) => rule.check(files));

  if (args.has('--update')) {
    saveBaseline(violations);
    writeLine(`Baseline regravada: ${violations.length} violações conhecidas.`);

    return;
  }

  if (args.has('--all'))
    report(
      (text) => process.stdout.write(text),
      `Todas as violações (${violations.length}):`,
      violations,
    );

  const { added, fixed } = compareWithBaseline(violations, loadBaseline());

  if (fixed.length > 0) {
    writeLine(
      `\n✓ ${fixed.length} item(ns) da baseline foram corrigidos. Rode "npm run check:design -- --update" e commite a baseline menor.`,
    );
  }

  if (added.length === 0) {
    writeLine(`\n✓ Design: nenhuma violação nova (${violations.length} conhecidas na baseline).`);

    return;
  }

  report(
    (text) => process.stdout.write(text),
    `Design: ${added.length} violação(ões) NOVA(S) — corrija antes de commitar:`,
    added,
  );
  writeLine('\nRegras: skills design-system e ui-standards (.claude/skills).');
  process.exitCode = 1;
}

function writeLine(text) {
  process.stdout.write(`${text}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Design: ${error.message}\n`);
  process.exitCode = process.argv.includes('--hook') ? 2 : 1;
}
