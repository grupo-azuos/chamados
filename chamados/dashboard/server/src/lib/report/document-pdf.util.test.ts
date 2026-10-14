import { describe, expect, it } from 'vitest';

import { renderPdfDocument } from './document-pdf.util';
import { type DocumentDefinition } from './document.type';

const VERIFY_URL = 'http://localhost:5005/verify/a1b2c3d4e5f60718293a4b5c6d7e8f90';

function definition(overrides: Partial<DocumentDefinition> = {}): DocumentDefinition {
  return {
    title: 'Ordem de serviço nº CH-0007',
    subtitle: 'Comprovante técnico de atendimento',
    reference: 'Ordem de serviço CH-0007 · Versão 1',
    orientation: 'portrait',
    createdAt: new Date('2026-03-02T11:00:00.000Z'),
    blocks: [
      { kind: 'badges', items: [{ text: 'Resolvido', tone: 'success' }] },
      { kind: 'fields', items: [{ label: 'Quem abriu', value: 'Bia Costa' }] },
      { kind: 'heading', text: 'Descrição do problema' },
      { kind: 'paragraph', text: 'A impressora não puxa papel.' },
      {
        kind: 'table',
        headers: ['Peça', 'Situação'],
        rows: [[{ text: 'Rolete' }, { text: 'Trocada', tone: 'success' }]],
        emptyText: 'Nenhuma peça usada.',
      },
    ],
    ...overrides,
  };
}

describe('renderPdfDocument', () => {
  // feliz
  it('draws a PDF, with the brand logo inside', async () => {
    const pdf = await renderPdfDocument(definition());

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.includes('/Subtype /Image')).toBe(true);
  });

  /* A ordem de serviço guarda a impressão digital do arquivo: a mesma definição tem que dar os
     mesmos bytes, senão toda reemissão pareceria um documento adulterado. */
  it('draws the very same bytes again for the same definition', async () => {
    const first = await renderPdfDocument(definition());
    const second = await renderPdfDocument(definition());

    expect(second.equals(first)).toBe(true);
  });

  it('writes the whole verification link in plain text, so it can be found and clicked', async () => {
    const pdf = await renderPdfDocument(
      definition({
        verification: {
          url: VERIFY_URL,
          displayUrl: 'http://localhost:5005/verify/a1b2c3d4',
          lines: [],
        },
      }),
    );

    expect(pdf.includes(VERIFY_URL)).toBe(true);
  });

  // triste
  it('still draws a page for a document with no blocks at all', async () => {
    const pdf = await renderPdfDocument(definition({ blocks: [], subtitle: undefined }));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('draws the empty text of a table that has no rows', async () => {
    const empty = definition({
      blocks: [{ kind: 'table', headers: ['Peça'], rows: [], emptyText: 'Nenhuma peça usada.' }],
    });

    await expect(renderPdfDocument(empty)).resolves.toBeInstanceOf(Buffer);
  });

  it('changes the bytes when anything in the definition changes', async () => {
    const first = await renderPdfDocument(definition());
    const other = await renderPdfDocument(definition({ title: 'Ordem de serviço nº CH-0008' }));

    expect(other.equals(first)).toBe(false);
  });
});
