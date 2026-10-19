import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SKIPPED = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'storybook-static',
  '.svelte-kit',
  '.git',
]);

function entries(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).filter(
    (entry) => !entry.isSymbolicLink() && !SKIPPED.has(entry.name),
  );
}

export function collectTextFiles(directory, accepts) {
  return entries(directory).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTextFiles(path, accepts);
    if (!entry.isFile() || !accepts(path)) return [];

    return [path];
  });
}

export function collectDocumentation(directory, covered, accepts) {
  return entries(directory)
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (covered.has(path)) return [];
      if (entry.name === 'docs') return collectTextFiles(path, accepts);

      return collectDocumentation(path, covered, accepts);
    });
}

export function readEditedPaths(root, raw) {
  const event = JSON.parse(raw);
  const input = event?.tool_input;
  if (!input || typeof input !== 'object')
    throw new Error('Design hook input must include tool_input');
  const paths = [
    input.file_path,
    input.notebook_path,
    ...(input.edits ?? []).map((edit) => edit.file_path),
  ];

  return [...new Set(paths.filter((path) => typeof path === 'string' && path.length > 0))].map(
    (path) => resolve(root, path),
  );
}
