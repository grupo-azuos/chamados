/**
 * NÚMERO E DINHEIRO POR EXTENSO, em português do Brasil.
 *
 * O contrato social repete o capital por extenso ao lado do número — "R$ 10.000,00 (dez mil
 * reais)" — e é o extenso que vale se os dois divergirem. O gerador antigo escrevia "um reais",
 * "um milhão reais" e jogava fora os centavos; cada um desses erros vira exigência da Junta.
 */
const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const TEENS = [
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];
const TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];
const HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

/** As casas de mil, do maior para o menor; "mil" não tem plural nem "um" na frente. */
const SCALES = [
  { value: 1_000_000_000, singular: 'bilhão', plural: 'bilhões' },
  { value: 1_000_000, singular: 'milhão', plural: 'milhões' },
  { value: 1_000, singular: 'mil', plural: 'mil' },
  { value: 1, singular: '', plural: '' },
] as const;

function belowHundred(n: number): string {
  if (n < 10) return UNITS[n] ?? '';
  if (n < 20) return TEENS[n - 10] ?? '';
  const unit = n % 10;
  const tens = TENS[Math.floor(n / 10)] ?? '';

  return unit ? `${tens} e ${UNITS[unit]}` : tens;
}

/** De 1 a 999. "cem" é só o cem redondo; "cento e um" em diante. */
function belowThousand(n: number): string {
  if (n === 100) return 'cem';
  const rest = n % 100;
  const parts = [HUNDREDS[Math.floor(n / 100)] ?? '', rest ? belowHundred(rest) : ''];

  return parts.filter(Boolean).join(' e ');
}

type Group = { count: number; words: string };

function groupWords(count: number, scale: (typeof SCALES)[number]): string {
  if (scale.value === 1_000 && count === 1) return 'mil';
  const name = count === 1 ? scale.singular : scale.plural;

  return [belowThousand(count), name].filter(Boolean).join(' ');
}

/**
 * O "e" entre as casas segue a regra de leitura: entra antes da última casa quando ela é menor
 * que cem ou uma centena redonda ("mil e cem", "mil e vinte"), e some no resto ("mil duzentos e
 * trinta"). Entre milhões e milhares vai vírgula, como se escreve em cheque e em contrato.
 */
function joinGroups(groups: Group[]): string {
  return groups.reduce((text, group, index) => {
    if (index === 0) return group.words;
    const isLast = index === groups.length - 1;
    const isRound = group.count < 100 || group.count % 100 === 0;
    if (isLast && isRound) return `${text} e ${group.words}`;
    const previous = groups[index - 1];
    if (previous && previous.words.endsWith('mil')) return `${text} ${group.words}`;

    return `${text}, ${group.words}`;
  }, '');
}

/** O inteiro por extenso, no masculino: 0 → "zero", 1001 → "mil e um". Fração é descartada. */
export function integerInWords(value: number): string {
  const n = Math.floor(Math.abs(Number.isFinite(value) ? value : 0));
  if (n === 0) return 'zero';

  let rest = n;
  const groups: Group[] = [];
  for (const scale of SCALES) {
    const count = Math.floor(rest / scale.value);
    rest %= scale.value;
    if (count > 0) groups.push({ count, words: groupWords(count, scale) });
  }

  return joinGroups(groups);
}

/**
 * "de reais" quando o valor termina numa casa de milhão redonda — "um milhão de reais", mas
 * "um milhão e cem mil reais".
 */
function currencyName(reais: number): string {
  if (reais === 1) return 'real';
  if (reais >= 1_000_000 && reais % 1_000_000 === 0) return 'de reais';

  return 'reais';
}

/**
 * O valor em reais por extenso: "um real", "dois milhões de reais", "dez reais e cinquenta
 * centavos", "um centavo". Arredonda no centavo, como o número escrito ao lado.
 */
export function moneyInWords(value: number): string {
  const totalCents = Math.round(Math.abs(Number.isFinite(value) ? value : 0) * 100);
  const reais = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  if (reais === 0 && cents === 0) return 'zero reais';

  const reaisText = reais ? `${integerInWords(reais)} ${currencyName(reais)}` : '';
  const centsText = cents ? `${integerInWords(cents)} ${cents === 1 ? 'centavo' : 'centavos'}` : '';

  return [reaisText, centsText].filter(Boolean).join(' e ');
}
