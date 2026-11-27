/**
 * Monta o `?a=1&b=2` de uma listagem.
 *
 * O que é `undefined`, `null` ou texto vazio NÃO entra. Mandar `?search=` ou
 * `?status=undefined` não é inofensivo: o primeiro vira um filtro vazio do lado de lá, e o
 * segundo é recusado pela validação — a tela mostraria "Confira os campos destacados" numa
 * listagem que não tem campo nenhum.
 *
 * Lista vira valores separados por vírgula.
 *
 * Mora no `shared` porque as duas pontas montam a mesma URL: a tela para pedir a página, o
 * servidor para escrever os `links` de paginação. Duas implementações dariam `self` com a
 * ordem ou o encode diferente do que a tela pediu.
 */
export type QueryValue = string | number | boolean | readonly string[] | null | undefined;

export function buildQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const serialized = serialize(value);
    if (serialized === null) continue;

    search.set(key, serialized);
  }

  const text = search.toString();

  return text === '' ? '' : `?${text}`;
}

function serialize(value: QueryValue): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.length === 0 ? null : value.join(',');

  const text = String(value).trim();

  return text === '' ? null : text;
}
