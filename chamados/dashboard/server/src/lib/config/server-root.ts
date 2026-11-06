import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * O `package.json` mais próximo, subindo de pasta a partir de `from`.
 *
 * O código roda de três jeitos: pelo fonte (`src/lib/...`, nos testes e no `npm run dev`), e
 * empacotado num arquivo só (`dist/main.js`, no container). No pacote, todo módulo vê o mesmo
 * `__dirname` (`dist/`), então contar `..` a partir do arquivo dá pastas diferentes em cada
 * caso. Subir até o `package.json` dá sempre a pasta `server/`.
 */
export function findPackageJson(from: string): string {
  const candidate = join(from, 'package.json');
  if (existsSync(candidate)) return candidate;

  const parent = dirname(from);
  if (parent === from) throw new Error(`package.json not found above ${from}`);

  return findPackageJson(parent);
}

/** A pasta `server/`, a mesma no fonte e no pacote. */
export const SERVER_ROOT = dirname(findPackageJson(__dirname));

/**
 * Arquivo que o server lê do disco (fonte, logo), pelo caminho dentro de `src/`. Empacotado, ele vem
 * do `dist/` (copiado pelo Rspack a partir dos `assets` do `nest-cli.json`); pelo fonte, do `src/`.
 */
export function serverAsset(path: string): string {
  const built = join(SERVER_ROOT, 'dist', path);

  return existsSync(built) ? built : join(SERVER_ROOT, 'src', path);
}
