import { type ServerResponse } from 'node:http';
import { relative, sep } from 'node:path';

/**
 * Por quanto tempo o navegador guarda cada arquivo do client que o Nest serve.
 *
 * O padrão do `express.static` é `public, max-age=0` em tudo: o navegador revalida cada
 * arquivo a cada carga de tela — dezenas de idas e voltas só para ouvir "não mudou". Aqui
 * são só duas regras, e a fronteira entre elas é o nome do arquivo:
 *
 *  - **`_app/immutable/`** — tudo o que o SvelteKit gera com hash no nome (JS, CSS, fontes,
 *    imagens importadas). Se o conteúdo muda, o nome muda; então o arquivo com aquele nome
 *    nunca muda, e pode ficar um ano no navegador sem nem ser revalidado (`immutable`).
 *    É a pasta do SvelteKit, e não o `assets/` do Vite puro: com o adapter-static o build
 *    sai em `dist/_app/immutable/{entry,chunks,nodes,assets}`.
 *  - **todo o resto** — `index.html` (e o fallback da SPA, que é ele), `service-worker.js`,
 *    `_app/version.json`, favicon, manifest e o que vem de `static/`. O nome desses NÃO
 *    muda entre versões; guardá-los sem revalidar prenderia a pessoa na versão velha da tela,
 *    apontando para chunks que o deploy novo já apagou. `no-cache` não é "não guarde": é
 *    "guarde, mas pergunte antes de usar" — com ETag, a pergunta custa um 304 sem corpo.
 *
 * `_app/version.json` fica de fora de propósito, apesar de morar em `_app/`: é por ele que o
 * SvelteKit descobre que saiu versão nova.
 */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const REVALIDATE_CACHE_CONTROL = 'no-cache';

const HASHED_DIR = '_app/immutable/';

/**
 * O `Cache-Control` de um arquivo, pelo caminho dele relativo à pasta do build.
 *
 * Recebe o caminho absoluto (é o que o `setHeaders` do `express.static` entrega) e compara
 * só o pedaço depois da raiz — senão uma pasta `_app/immutable` no caminho da própria
 * máquina, acima do build, faria qualquer arquivo parecer imutável.
 */
export function staticCacheControl(rootPath: string, filePath: string): string {
  const fromRoot = relative(rootPath, filePath).split(sep).join('/');

  return fromRoot.startsWith(HASHED_DIR) ? IMMUTABLE_CACHE_CONTROL : REVALIDATE_CACHE_CONTROL;
}

/**
 * O `setHeaders` pronto para o `serveStaticOptions` do `ServeStaticModule`.
 *
 * Vale para os arquivos do `express.static` e também para o fallback da SPA: o
 * `@nestjs/serve-static` chama o mesmo `setHeaders` com o caminho do `index.html` antes de
 * devolvê-lo. E o `send` por baixo só escreve o `Cache-Control` dele quando ninguém escreveu
 * antes — por isso o que sai daqui prevalece.
 *
 * As rotas da API não passam por aqui: elas estão no `exclude` do módulo, e cada download
 * (o agente, os anexos) continua decidindo o próprio `Cache-Control`.
 */
export function staticCacheHeaders(rootPath: string): (response: ServerResponse, filePath: string) => void {
  return (response, filePath) => {
    response.setHeader('Cache-Control', staticCacheControl(rootPath, filePath));
  };
}
