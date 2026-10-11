const BRAZIL_COUNTRY_CODE = '55';
/* Com o DDI do Brasil: 12 dígitos é fixo (ou celular antigo, sem o nono dígito), 13 é celular. */
const BRAZIL_LANDLINE_LENGTH = 12;
const BRAZIL_MOBILE_LENGTH = 13;

/**
 * O número vinculado, do jeito que uma pessoa lê: `+55 (62) 99999-0001`.
 *
 * O sistema guarda só dígitos com DDI. Número do Brasil ganha a máscara de sempre; de outro
 * país, só o `+` na frente — adivinhar a máscara de um país desconhecido mostraria um número
 * que não existe.
 */
export function formatLinkedPhone(digits: string | null | undefined): string {
  if (!digits) return '';
  if (!isBrazilian(digits)) return `+${digits}`;

  const area = digits.slice(2, 4);
  const local = digits.slice(4);
  const splitAt = local.length - 4;

  return `+${BRAZIL_COUNTRY_CODE} (${area}) ${local.slice(0, splitAt)}-${local.slice(splitAt)}`;
}

function isBrazilian(digits: string): boolean {
  if (!digits.startsWith(BRAZIL_COUNTRY_CODE)) return false;

  return digits.length === BRAZIL_LANDLINE_LENGTH || digits.length === BRAZIL_MOBILE_LENGTH;
}
