#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegistry } from './project-registry.mjs';
import {
  REGISTRY_PATH,
  repositoryRoot,
  validateMessage,
  validateRange,
} from './git-repository.mjs';
import { ensure } from './validation.util.mjs';

function parseArguments(args) {
  const [mode = '--check', ...values] = args;
  const expected = new Map([
    ['--check', 0],
    ['--message', 1],
    ['--range', 2],
    ['--session-hook', 0],
  ]);
  ensure(
    expected.has(mode) && values.length === expected.get(mode),
    'Usage: --check | --message FILE | --range BASE HEAD | --session-hook',
  );

  return { mode, values };
}

function sessionContext() {
  process.stdout.write(
    'Siga .claude/skills/participant-identity/SKILL.md antes de mudanças e commits. Leia docs/project.json e docs/metrics-privacy.md. Confirme a pessoa em cada sessão compartilhada, sem reaproveitar outra identidade. Peça somente dados ausentes e necessários depois de verificar a governança de privacidade. Nunca trate fornecimento de dados como consentimento automático. Use o modo de trailers definido no cadastro, também em merges e modo administrador.\n',
  );
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const { mode, values } = parseArguments(args);
  if (mode === '--session-hook') return sessionContext();
  const root = repositoryRoot(cwd);
  if (mode === '--message')
    return validateMessage(root, readFileSync(resolve(cwd, values[0]), 'utf8'));
  if (mode === '--range') return validateRange(root, ...values);
  parseRegistry(readFileSync(resolve(root, REGISTRY_PATH), 'utf8'));
}

function runCli() {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `Métricas: ${error.message}\nCorrija o cadastro ou a atribuição; não desative o hook.\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
