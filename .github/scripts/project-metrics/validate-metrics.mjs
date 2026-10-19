#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { privacyNotice } from './privacy-notice.mjs';
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

function sessionContext(cwd) {
  const root = repositoryRoot(cwd);
  const registry = parseRegistry(readFileSync(resolve(root, REGISTRY_PATH), 'utf8'));
  process.stdout.write(
    'Antes de pedir dados de métricas, siga .claude/skills/participant-identity/SKILL.md e docs/metrics-notice-flow.md. Leia docs/metrics-privacy.md. Mostre ao usuário na conversa o aviso abaixo; contexto do hook não significa apresentação. Não invente ciência ou consentimento. Confirme a pessoa em contas compartilhadas. Governança pendente também limita métricas por ID; continue ajudando com o código sem nova coleta.\n\n',
  );
  process.stdout.write(`${privacyNotice(registry)}\n`);
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const { mode, values } = parseArguments(args);
  if (mode === '--session-hook') return sessionContext(cwd);
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
