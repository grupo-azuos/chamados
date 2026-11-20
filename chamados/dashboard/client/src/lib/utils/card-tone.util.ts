import { isLightColor } from '$lib/utils/company-color.util';

/**
 * Os SOTAQUES de card do grupo — e a cor que a pessoa escolhe, que pinta exata.
 *
 * Card é sempre a superfície da marca; a cor entra só como sotaque: a bolinha do ícone, o número,
 * a marca d'água e a bolinha do selo. São oito tons sóbrios (`--hue-*` no `lib/theme/tokens.css`),
 * que clareiam no tema escuro para manter o contraste. As classes são escritas por extenso porque o
 * Tailwind só gera a classe que ele LÊ no código.
 */
export type AzuosCardHue =
  'blue' | 'red' | 'yellow' | 'green' | 'steel' | 'plum' | 'slate' | 'copper';

/** Os nomes de estado que as telas já usam, cada um preso a um sotaque. */
export type AzuosCardSemanticTone =
  'danger' | 'warning' | 'info' | 'success' | 'brand' | 'neutral' | 'default';

/** Uma cor escolhida pela pessoa, como foi gravada (`#rrggbb`). */
export type AzuosCustomColor = `#${string}`;

export type AzuosCardTone = AzuosCardHue | AzuosCardSemanticTone | AzuosCustomColor;

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
  warning: 'yellow',
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
  /* O amarelo é claro: o ícone na bolinha é escuro (`on-yellow`), e não o `on-hue`; e como texto
     ele é o `-ink`: o amarelo do grupo, puro, no número do card (ver `--hue-yellow-ink`). */
  yellow: {
    dot: 'bg-hue-yellow text-on-yellow',
    text: 'text-hue-yellow-ink',
    swatch: 'bg-hue-yellow',
    color: 'var(--hue-yellow)',
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

/**
 * As classes do sotaque de um tom. A cor escolhida não tem classe: os papéis vêm vazios (o
 * `style` de `cardToneStyle` pinta), e `color` é a própria cor, para a marca d'água e o hover.
 */
export function cardToneClasses(tone: AzuosCardTone | null | undefined): AzuosCardToneClasses {
  if (isCustomColor(tone)) return { dot: '', text: '', swatch: '', color: tone };

  return HUE_CLASSES[cardHueOf(tone)];
}

/**
 * A COR QUE A PESSOA ESCOLHEU (`#rrggbb`) pinta EXATAMENTE como foi escolhida, sem virar o sotaque
 * mais próximo: escolher laranja e ver amarelo tirava o sentido do seletor de cor. Ela não cabe
 * numa classe do Tailwind (é dado, não token), e por isso vem como `style`, ao lado das classes,
 * em `cardToneStyle`.
 */
export function isCustomColor(tone: unknown): tone is AzuosCustomColor {
  return typeof tone === 'string' && /^#[0-9a-f]{6}$/i.test(tone);
}

/**
 * O VÉU NO TOM: o sotaque a 16%, por cima do fundo. É o fundo do card colorido — transparente de
 * propósito, para o texto por cima seguir no tom do tema em vez de brigar com um fundo cheio.
 */
export function cardToneVeilOf(tone: AzuosCardTone | null | undefined): string {
  return `color-mix(in srgb, ${cardToneClasses(tone).color} 16%, transparent)`;
}

/** O tom de uma cor escolhida: a própria cor, quando é válida; sem ela, o neutro. */
export function cardToneFromColor(color: string | null | undefined): AzuosCardTone {
  return isCustomColor(color) ? color : 'neutral';
}

export type AzuosCardToneStyle = { dot?: string; text?: string; swatch?: string };

/**
 * O `style` da cor escolhida em cada papel — vazio para os sotaques da marca, que já vêm nas
 * classes. Na bolinha cheia o ícone fica escuro sobre cor clara e claro sobre cor escura.
 */
export function cardToneStyle(tone: AzuosCardTone | null | undefined): AzuosCardToneStyle {
  if (!isCustomColor(tone)) return {};

  const onColor = isLightColor(tone) ? 'var(--ink-900)' : 'var(--white)';

  return {
    dot: `background-color: ${tone}; color: ${onColor};`,
    text: `color: ${tone};`,
    swatch: `background-color: ${tone};`,
  };
}
