import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { type INestApplication, VersioningType } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { HttpExceptionFilter } from './http-exception.filter';

/**
 * A VERSÃO DO CONTRATO, em dois lugares e com dois papéis.
 *
 * - **No caminho, só o MAJOR** (`/api/v1/...`). É o que quem consome fixa no código, e só muda
 *   quando o contrato quebra (campo removido, renomeado ou apertado — CONTRIBUTING §4). Quando
 *   isso acontecer, a rota nova nasce em `v2` e a `v1` continua respondendo até os sistemas
 *   migrarem. Versão no caminho e não em cabeçalho: aparece na URL, no log e no Traefik, e não
 *   depende de quem chama lembrar de mandar nada.
 * - **No cabeçalho `API-Version` de toda resposta, a versão INTEIRA** (`1.0.1`), a mesma do
 *   `package.json` e da tag do git. Serve para conferir qual build respondeu, sem obrigar quem
 *   consome a mudar de URL a cada correção.
 */
export const API_MAJOR = '1';

export const API_PREFIX = 'api';

export const API_VERSION_HEADER = 'API-Version';

/** O começo de todo caminho versionado: `/api/v1`. */
export const API_BASE_PATH = `/${API_PREFIX}/v${API_MAJOR}`;

let cachedVersion: string | undefined;

/**
 * A versão do pacote — a mesma que vira tag no release. O `package.json` é procurado subindo de
 * pasta, porque este arquivo roda de `src/` no teste e de `dist/` no container.
 */
export function packageVersion(): string {
  cachedVersion ??= (
    JSON.parse(readFileSync(findPackageJson(__dirname), 'utf8')) as { version: string }
  ).version;

  return cachedVersion;
}

function findPackageJson(from: string): string {
  const candidate = join(from, 'package.json');
  if (existsSync(candidate)) return candidate;

  const parent = dirname(from);
  if (parent === from) throw new Error(`package.json not found above ${__dirname}`);

  return findPackageJson(parent);
}

/**
 * As convenções HTTP desta API, num lugar só: o `main.ts` e os testes E2E sobem o app pelo
 * mesmo caminho, e o teste não pode passar com uma configuração que a produção não tem.
 */
export function applyHttpConventions(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_MAJOR });
  app.use(stampVersion);
  app.useGlobalFilters(new HttpExceptionFilter());
}

/** Vale também para erro e para 404 de rota: o cabeçalho sai antes de qualquer resposta. */
function stampVersion(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader(API_VERSION_HEADER, packageVersion());
  next();
}
