/**
 * As cores sugeridas para as tags de empresa — a cor da principal é a que pinta o cartão.
 *
 * Cinco, e não uma lista longa, porque a cor serve para o olho agrupar e reencontrar um
 * cartão na grade — com vinte tons, dois vizinhos quase iguais deixam de ser distinguíveis e
 * a cor para de ajudar. Outra cor continua possível pelo seletor livre.
 *
 * Os cinco tons são escuros o bastante para texto branco por cima (contraste ≥ 4,5:1). É o
 * que permite o cartão inteiro ser colorido sem o nome da empresa sumir nele.
 */
export const COMPANY_COLOR_PALETTE = [
  '#2563eb',
  '#047857',
  '#7c3aed',
  '#e11d48',
  '#b45309',
] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/** Guardada sempre em minúsculas: `#2563EB` e `#2563eb` são a mesma cor, e a comparação precisa saber disso. */
export function normalizeHexColor(value: string): string {
  return value.toLowerCase();
}

/**
 * A cor é clara demais para texto branco?
 *
 * A paleta é toda escura, mas a pessoa pode escolher qualquer cor — um amarelo com texto
 * branco por cima é um cartão sem nome. Usa a luminância relativa da WCAG e troca para
 * texto escuro quando o branco teria menos contraste que o preto.
 */
export function isLightColor(hex: string): boolean {
  if (!isHexColor(hex)) return false;

  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;

    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  /* Contraste com branco = 1,05 / (L + 0,05); com preto = (L + 0,05) / 0,05. O ponto em que
     os dois se igualam é L ≈ 0,179. */
  return luminance > 0.179;
}
