import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

const INSTALL_COMMAND = /\b(?:npm|pnpm|yarn)\s+(?:install|i|add)\b/;

function readPatterns(directory, filename) {
  const file = join(directory, filename);
  try {
    return readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => new RegExp(line));
  } catch (error) {
    throw new Error(`Cannot load protection rules: ${filename}`, { cause: error });
  }
}

function symbolicLinkTarget(path) {
  try {
    if (!lstatSync(path).isSymbolicLink()) return null;

    return resolve(dirname(path), readlinkSync(path));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function canonicalPath(path, visited = new Set()) {
  if (visited.has(path)) throw new Error('Symbolic link cycle in edited path');
  const target = symbolicLinkTarget(path);
  if (target) {
    visited.add(path);

    return canonicalPath(target, visited);
  }
  if (existsSync(path)) return realpathSync(path);
  const parent = dirname(path);
  if (parent === path) return path;

  return join(canonicalPath(parent, visited), basename(path));
}

function insideRepository(root, path) {
  const result = relative(root, path).split('\\').join('/');
  if (result === '..' || result.startsWith('../') || isAbsolute(result)) return null;

  return result;
}

function repositoryPaths(root, file) {
  const absolute = resolve(root, file);
  const canonicalRoot = canonicalPath(root);

  return [
    ...new Set(
      [
        insideRepository(root, absolute),
        insideRepository(canonicalRoot, canonicalPath(absolute)),
      ].filter((path) => path !== null),
    ),
  ];
}

function matchesAny(patterns, paths) {
  return paths.some((path) => patterns.some((pattern) => pattern.test(path)));
}

function packageName(token) {
  const unquoted = token.replace(/^['"]|['"]$/g, '');
  const version = unquoted.lastIndexOf('@');
  if (version <= 0) return unquoted;

  return unquoted.slice(0, version);
}

function installedPackages(command) {
  const match = INSTALL_COMMAND.exec(command);
  if (!match) return [];
  const argumentsText = command.slice(match.index + match[0].length).split(/[;&|]/)[0];

  return (argumentsText.match(/"[^"]*"|'[^']*'|\S+/g) ?? [])
    .filter((token) => !token.startsWith('-'))
    .map(packageName);
}

export function createProtection(root, listsDirectory) {
  // As listas são lidas uma vez; arquivo ausente nunca vira permissão implícita.
  const auth = readPatterns(listsDirectory, 'protected-auth.txt');
  const structure = readPatterns(listsDirectory, 'protected-structure.txt');
  const dependencies = readPatterns(listsDirectory, 'protected-auth-deps.txt');

  function checkFile(file) {
    const paths = repositoryPaths(root, file);
    if (matchesAny(auth, paths))
      return 'Login e identidade pertencem ao auth-forward. Siga a skill mvp-limits e fale com o suporte.';
    if (matchesAny(structure, paths))
      return 'Este arquivo contém regras ou estrutura protegida. Siga a skill support; não altere a regra para contornar o bloqueio.';

    return null;
  }

  function checkCommand(command) {
    const blocked = installedPackages(command).filter((name) =>
      dependencies.some((pattern) => pattern.test(name)),
    );
    if (blocked.length === 0) return null;

    return 'A instalação inclui biblioteca de autenticação protegida. A identidade vem do auth-forward; siga a skill mvp-limits.';
  }

  return { checkFile, checkCommand };
}
