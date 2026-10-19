import { execFileSync, spawnSync } from 'node:child_process';
import { parseRegistry } from './project-registry.mjs';
import { validateCommitIdentity } from './commit-identity.mjs';
import { ensure } from './validation.util.mjs';
import { validateProfileChanges } from './profile-registration.mjs';

export const REGISTRY_PATH = 'docs/project.json';

export function runGit(root, args, input) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    input,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export function repositoryRoot(cwd = process.cwd()) {
  return runGit(cwd, ['rev-parse', '--show-toplevel']);
}

function registryExists(root, revision) {
  const result = spawnSync('git', ['cat-file', '-e', `${revision}:${REGISTRY_PATH}`], {
    cwd: root,
    stdio: 'ignore',
  });
  ensure(!result.error, 'Git is unavailable');

  return result.status === 0;
}

function registryAt(root, revision) {
  return parseRegistry(runGit(root, ['show', `${revision}:${REGISTRY_PATH}`]));
}

export function validateMessage(root, message) {
  const data = registryAt(root, '');
  const trailers = runGit(root, ['interpret-trailers', '--parse'], message);
  validateCommitIdentity(data, trailers);
  if (registryExists(root, 'HEAD')) validateProfileChanges(registryAt(root, 'HEAD'), data);
}

function validateRevision(root, revision) {
  const present = registryExists(root, revision);
  const parents = runGit(root, ['rev-list', '--parents', '-n', '1', revision]).split(' ').slice(1);
  if (!present && !parents.some((parent) => registryExists(root, parent))) return;
  ensure(present, `${revision.slice(0, 12)} removed ${REGISTRY_PATH}`);
  const data = registryAt(root, revision);
  const message = runGit(root, ['show', '-s', '--format=%B', revision]);
  const trailers = runGit(root, ['interpret-trailers', '--parse'], message);
  try {
    validateCommitIdentity(data, trailers);
    if (parents[0] && registryExists(root, parents[0]))
      validateProfileChanges(registryAt(root, parents[0]), data);
  } catch (error) {
    throw new Error(`${revision.slice(0, 12)}: ${error.message}`, { cause: error });
  }
}

export function validateRange(root, base, head) {
  ensure(registryExists(root, head), `Range head is missing ${REGISTRY_PATH}`);
  const selection = !base || /^0+$/.test(base) ? head : `${base}..${head}`;
  const revisions = runGit(root, ['rev-list', '--reverse', selection]).split('\n').filter(Boolean);
  revisions.forEach((revision) => validateRevision(root, revision));
}
