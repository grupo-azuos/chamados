#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProtection } from './protection-rules.mjs';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const LISTS_DIR = join(PROJECT_DIR, 'chamados/dashboard/scripts/git');
const ADMIN_KEY = 'project.admin';

function isAdmin(root) {
  try {
    return (
      execFileSync('git', ['config', '--get', ADMIN_KEY], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() === 'true'
    );
  } catch (error) {
    if (error.status === 1 || error.status === 128) return false;
    throw error;
  }
}

function eventInput(raw) {
  const event = JSON.parse(raw);
  if (!event?.tool_input || typeof event.tool_input !== 'object')
    throw new Error('Hook input must include tool_input');

  return event.tool_input;
}

function editedFiles(input) {
  const paths = [
    input.file_path,
    input.notebook_path,
    ...(input.edits ?? []).map((edit) => edit.file_path),
  ];

  return [...new Set(paths.filter((path) => typeof path === 'string' && path.length > 0))];
}

export function protectionDecision(input, protection) {
  const fileBlock = editedFiles(input).map(protection.checkFile).find(Boolean);
  if (fileBlock) return fileBlock;
  if (typeof input.command === 'string') return protection.checkCommand(input.command);

  return null;
}

function main() {
  if (isAdmin(PROJECT_DIR)) return;
  const input = eventInput(readFileSync(0, 'utf8'));
  const protection = createProtection(PROJECT_DIR, LISTS_DIR);
  const reason = protectionDecision(input, protection);
  if (!reason) return;
  process.stderr.write(`BLOQUEADO: ${reason}\n`);
  process.exitCode = 2;
}

function runCli() {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `Proteção indisponível: ${error.message}\nAcione o suporte para corrigir o hook; a operação foi bloqueada.\n`,
    );
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
