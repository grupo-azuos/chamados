/**
 * A CDN DA MARCA DO GRUPO — o app brand publica ali o logo, os ícones e o Zuzu. Todo sistema
 * do grupo usa os arquivos DE LÁ, e nenhum guarda cópia: trocar a marca no brand troca em todos.
 */
export const BRAND_CDN_URL = 'https://cdn.grupoazuos.com.br';

/**
 * O endereço de um arquivo da marca na CDN. `key` é o caminho dele lá, no padrão
 * `<pasta>/<formato>/<arquivo>`: `logo/png/azuos-logo-oficial-white.png`, `zuzu/zuzu-joinha.png`.
 */
export function brandAssetUrl(key: string): string {
  return `${BRAND_CDN_URL}/${key}`;
}
