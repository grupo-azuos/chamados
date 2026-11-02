/**
 * Os SOTAQUES de card do grupo — a única fonte de cor de card.
 *
 * Card é sempre a superfície da marca; a cor entra só como sotaque: a bolinha do ícone, o número,
 * a marca d'água e a bolinha do selo. São oito tons sóbrios (`--hue-*` no `lib/theme/tokens.css`),
 * que clareiam no tema escuro para manter o contraste. As classes são escritas por extenso porque o
 * Tailwind só gera a classe que ele LÊ no código.
 */
export type AzuosCardHue =
  'blue' | 'red' | 'amber' | 'green' | 'steel' | 'plum' | 'slate' | 'copper';

/** Os nomes de estado que as telas já usam, cada um preso a um sotaque. */
export type AzuosCardSemanticTone =
  'danger' | 'warning' | 'info' | 'success' | 'brand' | 'neutral' | 'default';

export type AzuosCardTone = AzuosCardHue | AzuosCardSemanticTone;

export type AzuosCardToneClasses = {
  /** A bolinha do ícone: o sotaque cheio, com o ícone em `on-hue`. */
  dot: string;
  /** O texto no sotaque (o número grande). */
  text: string;
  /** Só o fundo no sotaque (a bolinha pequena do selo, a barra do gráfico). */
  swatch: string;
  /** A cor do sotaque como valor CSS, para a marca d'água e o hover colorido. */
  color: string;
};

const SEMANTIC_HUE: Record<AzuosCardSemanticTone, AzuosCardHue> = {
  danger: 'red',
  warning: 'amber',
  info: 'steel',
  success: 'green',
  brand: 'blue',
  neutral: 'slate',
  default: 'slate',
};

const HUE_CLASSES: Record<AzuosCardHue, AzuosCardToneClasses> = {
  blue: {
    dot: 'bg-hue-blue text-on-hue',
    text: 'text-hue-blue',
    swatch: 'bg-hue-blue',
    color: 'var(--hue-blue)',
  },
  red: {
    dot: 'bg-hue-red text-on-hue',
    text: 'text-hue-red',
    swatch: 'bg-hue-red',
    color: 'var(--hue-red)',
  },
  amber: {
    dot: 'bg-hue-amber text-on-hue',
    text: 'text-hue-amber',
    swatch: 'bg-hue-amber',
    color: 'var(--hue-amber)',
  },
  green: {
    dot: 'bg-hue-green text-on-hue',
    text: 'text-hue-green',
    swatch: 'bg-hue-green',
    color: 'var(--hue-green)',
  },
  steel: {
    dot: 'bg-hue-steel text-on-hue',
    text: 'text-hue-steel',
    swatch: 'bg-hue-steel',
    color: 'var(--hue-steel)',
  },
  plum: {
    dot: 'bg-hue-plum text-on-hue',
    text: 'text-hue-plum',
    swatch: 'bg-hue-plum',
    color: 'var(--hue-plum)',
  },
  slate: {
    dot: 'bg-hue-slate text-on-hue',
    text: 'text-hue-slate',
    swatch: 'bg-hue-slate',
    color: 'var(--hue-slate)',
  },
  copper: {
    dot: 'bg-hue-copper text-on-hue',
    text: 'text-hue-copper',
    swatch: 'bg-hue-copper',
    color: 'var(--hue-copper)',
  },
};

/** Os sotaques, na ordem em que os gráficos e os seletores de cor os usam. */
export const CARD_HUES = Object.keys(HUE_CLASSES) as AzuosCardHue[];

/** O sotaque de um tom: o nome de estado vira o sotaque combinado; um sotaque passa direto. */
export function cardHueOf(tone: AzuosCardTone | null | undefined): AzuosCardHue {
  if (!tone) return 'slate';
  if (tone in SEMANTIC_HUE) return SEMANTIC_HUE[tone as AzuosCardSemanticTone];

  return CARD_HUES.includes(tone as AzuosCardHue) ? (tone as AzuosCardHue) : 'slate';
}

/** As classes do sotaque de um tom. */
export function cardToneClasses(tone: AzuosCardTone | null | undefined): AzuosCardToneClasses {
  return HUE_CLASSES[cardHueOf(tone)];
}

/** O ângulo de cada sotaque no círculo de cores, para casar uma cor livre com o mais próximo. */
const HUE_ANGLE: [AzuosCardHue, number][] = [
  ['red', 0],
  ['copper', 22],
  ['amber', 40],
  ['green', 160],
  ['steel', 200],
  ['blue', 228],
  ['plum', 268],
  ['red', 345],
];

/**
 * Uma cor que a PESSOA escolheu (`#rrggbb`) vira o sotaque mais próximo. Cor quase sem
 * saturação vira ardósia. Assim a escolha dela é respeitada e o card continua no padrão.
 */
export function cardHueFromHex(hex: string | null | undefined): AzuosCardHue {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!match?.[1]) return 'slate';

  const value = Number.parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta < 0.12) return 'slate';

  return nearestHue(hueAngle(r, g, b, max, delta));
}

function hueAngle(r: number, g: number, b: number, max: number, delta: number): number {
  if (max === r) return (60 * ((g - b) / delta) + 360) % 360;
  if (max === g) return 60 * ((b - r) / delta) + 120;

  return 60 * ((r - g) / delta) + 240;
}

function nearestHue(angle: number): AzuosCardHue {
  let best: [AzuosCardHue, number] = ['red', 360];
  for (const [hue, at] of HUE_ANGLE) {
    const distance = Math.abs(angle - at);
    if (distance < best[1]) best = [hue, distance];
  }

  return best[0];
}
