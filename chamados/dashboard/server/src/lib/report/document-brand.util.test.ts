import { describe, expect, it } from 'vitest';

import {
  generatedAtLabel,
  isNumericColumn,
  LOGO_BLUE_PNG,
  LOGO_BLUE_SVG,
  LOGO_RATIO,
  LOGO_WHITE_PNG,
  logoHeightFor,
} from './document-brand.util';

/* Todo PNG começa com estes 8 bytes, e guarda a largura e a altura logo depois, no bloco IHDR. */
const PNG_SIGNATURE = '89504e470d0a1a0a';

const cells = (...values: string[]) => values.map((text) => [{ text }]);

describe('the brand logos', () => {
  // feliz
  it('are a real SVG and real PNGs, in the proportion the code assumes', () => {
    expect(LOGO_BLUE_SVG).toContain('<svg');
    for (const png of [LOGO_BLUE_PNG, LOGO_WHITE_PNG]) {
      expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
      const ratio = png.readUInt32BE(16) / png.readUInt32BE(20);
      expect(ratio).toBeCloseTo(LOGO_RATIO, 1);
    }
  });

  // triste
  it('gives no height for a logo with no width', () => {
    expect(logoHeightFor(0)).toBe(0);
  });
});

describe('generatedAtLabel', () => {
  // feliz
  it('writes the Brasília time, wherever the server is', () => {
    expect(generatedAtLabel(new Date('2026-09-17T17:30:00Z'))).toBe('Gerado em 17/09/2026, 14:30');
  });
});

describe('isNumericColumn', () => {
  // feliz
  it('treats a column of numbers and dashes as numeric', () => {
    expect(isNumericColumn([...cells('12'), ...cells('—'), ...cells('3,5%')], 0)).toBe(true);
  });

  // triste
  it('does not treat text, or an empty column, as numeric', () => {
    expect(isNumericColumn(cells('12', 'Ana'), 0)).toBe(false);
    expect(isNumericColumn([], 0)).toBe(false);
  });
});
