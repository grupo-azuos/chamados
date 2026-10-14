import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_COLORS,
  DOCUMENT_TONE_SOFT_COLORS,
  excelColor,
  pdfColor,
} from './document-palette.util';
import { type DocumentTone } from './document.type';

const HEX = /^[0-9A-F]{6}$/;
const TONES: DocumentTone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'brand'];

describe('document palette', () => {
  // feliz
  /* Sem `#`: é o formato que o Word e o Excel pedem. O PDF acrescenta o dele. */
  it('keeps every colour as six hexadecimal digits, without the hash', () => {
    for (const colour of Object.values(DOCUMENT_PALETTE)) expect(colour).toMatch(HEX);
  });

  it('has a full and a soft pair for every tone a document can use', () => {
    for (const tone of TONES) {
      expect(DOCUMENT_TONE_COLORS[tone].fill).toMatch(HEX);
      expect(DOCUMENT_TONE_COLORS[tone].text).toMatch(HEX);
      expect(DOCUMENT_TONE_SOFT_COLORS[tone].fill).toMatch(HEX);
      expect(DOCUMENT_TONE_SOFT_COLORS[tone].text).toMatch(HEX);
    }
  });

  /* O selo da marca é a cor principal do tema: um documento é da mesma identidade da tela. */
  it('paints the brand tone with the primary colour of the theme', () => {
    expect(DOCUMENT_TONE_COLORS.brand.fill).toBe(DOCUMENT_PALETTE.primary);
    expect(DOCUMENT_TONE_SOFT_COLORS.brand.text).toBe(DOCUMENT_PALETTE.primary);
  });

  // triste
  /* Selo suave é fundo claro com texto forte: os dois iguais dariam um selo ilegível. */
  it('never gives a tone the same colour for the background and the text', () => {
    for (const tone of TONES) {
      expect(DOCUMENT_TONE_COLORS[tone].fill).not.toBe(DOCUMENT_TONE_COLORS[tone].text);
      expect(DOCUMENT_TONE_SOFT_COLORS[tone].fill).not.toBe(DOCUMENT_TONE_SOFT_COLORS[tone].text);
    }
  });
});

describe('excelColor', () => {
  // feliz
  it('puts full opacity in front, the ARGB format the spreadsheet asks for', () => {
    expect(excelColor('7C3AED')).toBe('FF7C3AED');
  });
});

describe('pdfColor', () => {
  // feliz
  it('puts the hash in front, the format the PDF asks for', () => {
    expect(pdfColor('7C3AED')).toBe('#7C3AED');
  });
});
