import { type INestApplication } from '@nestjs/common';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { API_MAJOR, API_PREFIX } from './api-version';

/**
 * As versões publicadas no seletor do Swagger, da mais nova para a mais antiga. Quando a `v2`
 * nascer, ela entra aqui na frente e a `v1` continua listada até ser desligada.
 */
export const PUBLISHED_MAJORS: readonly string[] = [API_MAJOR];

/**
 * Serve um documento por versão (`/docs/v1-json`) e uma tela só, em `/docs`, com o seletor de
 * versão no topo e a caixa de busca por grupo. `/docs-json` continua sendo a versão mais nova,
 * para quem gera cliente a partir dele. É a mesma tela do admin-console e da shared-api.
 *
 * Só JSON (`raw: ['json']`): por padrão o Swagger publica também `/docs-yaml` — o mesmo mapa
 * inteiro da API, num caminho que a trava da documentação não cobria.
 */
export function setupOpenApiDocs(
  app: INestApplication,
  document: OpenAPIObject,
  siteTitle: string,
): void {
  for (const major of PUBLISHED_MAJORS) {
    SwaggerModule.setup(`docs/v${major}`, app, onlyMajor(document, major), {
      ui: false,
      raw: ['json'],
      jsonDocumentUrl: `docs/v${major}-json`,
    });
  }

  SwaggerModule.setup('docs', app, onlyMajor(document, PUBLISHED_MAJORS[0] ?? API_MAJOR), {
    jsonDocumentUrl: 'docs-json',
    raw: ['json'],
    explorer: true,
    customSiteTitle: `${siteTitle} — documentação`,
    swaggerOptions: {
      urls: PUBLISHED_MAJORS.map((major) => ({
        url: `/docs/v${major}-json`,
        name: `v${major}`,
      })),
      // Caixa de busca no topo: filtra os grupos pelo nome.
      filter: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 0,
      deepLinking: true,
    },
  });
}

/**
 * Só as rotas de uma versão, mais as sem versão (`/health` e afins), que valem para todas: o
 * endereço delas é fixado fora daqui e não muda de uma versão para outra.
 */
export function onlyMajor(document: OpenAPIObject, major: string): OpenAPIObject {
  const versioned = /^\/api\/v\d+\//;
  const prefix = `/${API_PREFIX}/v${major}/`;
  const paths = Object.fromEntries(
    Object.entries(document.paths).filter(
      ([path]) => path.startsWith(prefix) || !versioned.test(path),
    ),
  );

  return {
    ...document,
    info: { ...document.info, title: `${document.info.title} v${major}` },
    paths,
  };
}
