import { describe, expect, it } from 'vitest';

import { hasThemeColor, themeColor } from './theme-color.util';

describe('themeColor', () => {
  // feliz
  it('reads a colour written straight in tokens.css', () => {
    expect(themeColor('--brand-blue-600')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('follows var() chains down to the written colour', () => {
    // `--warning` aponta para `--yellow`: a resposta é a cor, não a referência.
    expect(themeColor('--warning')).toBe(themeColor('--yellow'));
    expect(themeColor('--warning')).not.toContain('var(');
  });

  it('accepts the name with or without the dashes, and inside var()', () => {
    expect(themeColor('success')).toBe(themeColor('--success'));
    expect(themeColor('var(--success)')).toBe(themeColor('--success'));
  });

  it('reads the LIGHT theme, never the dark overrides', () => {
    // No escuro o fundo é quase preto; no claro, quase branco. Quem lê o arquivo vê o claro.
    expect(themeColor('--background')).not.toBe('#0b1220');
    expect(hasThemeColor('--background')).toBe(true);
  });

  // triste
  it('refuses a token that is not in tokens.css instead of inventing a colour', () => {
    expect(hasThemeColor('--nao-existe')).toBe(false);
    expect(() => themeColor('--nao-existe')).toThrow(/desconhecido/);
  });
});
