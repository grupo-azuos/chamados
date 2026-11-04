import { describe, expect, it } from 'vitest';

import { CARD_HUES, cardHueFromHex, cardHueOf, cardToneClasses } from './card-tone.util';

describe('card tone', () => {
  // feliz
  it('maps every state name to its accent and keeps an accent as it is', () => {
    expect(cardHueOf('danger')).toBe('red');
    expect(cardHueOf('warning')).toBe('amber');
    expect(cardHueOf('info')).toBe('steel');
    expect(cardHueOf('success')).toBe('green');
    expect(cardHueOf('brand')).toBe('blue');
    expect(cardHueOf('plum')).toBe('plum');
  });

  it('gives every accent its dot, text, swatch and colour, all from tokens', () => {
    expect(CARD_HUES).toHaveLength(8);
    for (const hue of CARD_HUES) {
      expect(cardToneClasses(hue)).toEqual({
        dot: `bg-hue-${hue} text-on-hue`,
        text: `text-hue-${hue}`,
        swatch: `bg-hue-${hue}`,
        color: `var(--hue-${hue})`,
      });
    }
  });

  it('turns a free colour into the nearest accent', () => {
    expect(cardHueFromHex('#dc2626')).toBe('red');
    expect(cardHueFromHex('#ea580c')).toBe('copper');
    expect(cardHueFromHex('#d97706')).toBe('amber');
    expect(cardHueFromHex('#16a34a')).toBe('green');
    expect(cardHueFromHex('#0284c7')).toBe('steel');
    expect(cardHueFromHex('#2563eb')).toBe('blue');
    expect(cardHueFromHex('#7c3aed')).toBe('plum');
    expect(cardHueFromHex('#6b7280')).toBe('slate');
  });

  // triste
  it('falls back to slate for nothing, an unknown name or a broken colour', () => {
    expect(cardHueOf(undefined)).toBe('slate');
    expect(cardHueOf('purple' as never)).toBe('slate');
    expect(cardHueFromHex('vermelho')).toBe('slate');
    expect(cardHueFromHex(null)).toBe('slate');
  });
});
