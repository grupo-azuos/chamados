import { describe, expect, it } from 'vitest';

import {
  CARD_HUES,
  cardHueOf,
  cardToneClasses,
  cardToneFromColor,
  cardToneStyle,
  cardToneVeilOf,
  isCustomColor,
} from './card-tone.util';

describe('card tone', () => {
  // feliz
  it('maps every state name to its accent and keeps an accent as it is', () => {
    expect(cardHueOf('danger')).toBe('red');
    expect(cardHueOf('warning')).toBe('yellow');
    expect(cardHueOf('info')).toBe('steel');
    expect(cardHueOf('success')).toBe('green');
    expect(cardHueOf('brand')).toBe('blue');
    expect(cardHueOf('plum')).toBe('plum');
  });

  it('gives every accent its dot, text, swatch and colour, all from tokens', () => {
    expect(CARD_HUES).toHaveLength(8);
    for (const hue of CARD_HUES.filter((item) => item !== 'yellow')) {
      expect(cardToneClasses(hue)).toEqual({
        dot: `bg-hue-${hue} text-on-hue`,
        text: `text-hue-${hue}`,
        swatch: `bg-hue-${hue}`,
        color: `var(--hue-${hue})`,
      });
    }
  });

  /* O amarelo é claro: ícone escuro na bolinha, e o número no amarelo puro do `-ink`. */
  it('draws the yellow accent with a dark icon and the pure group yellow as text', () => {
    expect(cardToneClasses('yellow')).toEqual({
      dot: 'bg-hue-yellow text-on-yellow',
      text: 'text-hue-yellow-ink',
      swatch: 'bg-hue-yellow',
      color: 'var(--hue-yellow)',
    });
  });

  it('paints a colour the person chose exactly, with a readable icon on top', () => {
    expect(cardToneClasses('#ea580c')).toEqual({ dot: '', text: '', swatch: '', color: '#ea580c' });
    expect(cardToneStyle('#1d4ed8')).toEqual({
      dot: 'background-color: #1d4ed8; color: var(--white);',
      text: 'color: #1d4ed8;',
      swatch: 'background-color: #1d4ed8;',
    });
    expect(cardToneStyle('#facc15').dot).toContain('color: var(--ink-900)');
    expect(cardToneVeilOf('#ea580c')).toBe('color-mix(in srgb, #ea580c 16%, transparent)');
    expect(cardToneFromColor('#16a34a')).toBe('#16a34a');
  });

  // triste
  it('falls back to slate for nothing, an unknown name or a broken colour', () => {
    expect(cardHueOf(undefined)).toBe('slate');
    expect(cardHueOf('purple' as never)).toBe('slate');
    expect(isCustomColor('vermelho')).toBe(false);
    expect(cardToneFromColor('vermelho')).toBe('neutral');
    expect(cardToneFromColor(null)).toBe('neutral');
    expect(cardToneStyle('brand')).toEqual({});
  });
});
