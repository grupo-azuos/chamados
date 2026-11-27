/**
 * UUID VERSÃO 7 (RFC 9562), O ID DE TUDO O QUE NASCE NESTE SISTEMA E NO CADASTRO COMPARTILHADO.
 *
 * O id derivado do conteúdo (hash do CNPJ, do nome, de empresa + tipo) foi o que durou até aqui,
 * e cobrava caro: colidia, precisava de tentativas de "rehash" e mudava de sentido quando o nome
 * mudava. O uuid v7 começa pelo instante em milissegundos — nasce em ordem de criação, e o
 * índice cresce pela ponta — e o resto é aleatório.
 *
 * `crypto.getRandomValues` existe no navegador e no Node: a mesma função serve aos dois lados.
 */
export function uuidV7(now: number = Date.now()): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let millis = now;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = millis % 256;
    millis = Math.floor(millis / 256);
  }
  /* Versão 7 no nibble alto do byte 6; variante RFC (10xx) no byte 8. */
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Confere o formato antes de o valor chegar ao banco, que recusaria com erro 500. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
