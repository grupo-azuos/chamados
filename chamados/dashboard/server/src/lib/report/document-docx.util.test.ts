import { describe, expect, it } from 'vitest';

import { renderDocxDocument } from './document-docx.util';
import { type DocumentDefinition } from './document.type';

/* Um .docx é um arquivo zip: começa com esta assinatura, e os nomes das partes aparecem em
   texto no índice dele — é por eles que se confere o que foi embutido. */
const ZIP_SIGNATURE = 'PK';

function definition(overrides: Partial<DocumentDefinition> = {}): DocumentDefinition {
  return {
    title: 'Chamados',
    subtitle: '2 chamados · gerado em 02/03/2026',
    reference: 'Chamados',
    orientation: 'landscape',
    blocks: [
      { kind: 'badges', items: [{ text: 'Aberto', tone: 'info' }] },
      { kind: 'fields', items: [{ label: 'Quem abriu', value: 'Bia Costa' }] },
      { kind: 'heading', text: 'Resumo' },
      { kind: 'paragraph', text: 'A impressora não puxa papel.' },
      {
        kind: 'table',
        headers: ['Protocolo', 'Solicitante', 'Situação'],
        rows: [
          [{ text: 'CH-0001' }, { text: 'Bia Costa' }, { text: 'Aberto', tone: 'info' }],
          [{ text: 'CH-0002' }, { text: 'Caio Reis' }, { text: 'Resolvido', tone: 'success' }],
        ],
        titleColumnIndex: 0,
        emptyText: 'Nenhum registro encontrado com esse filtro.',
      },
    ],
    ...overrides,
  };
}

describe('renderDocxDocument', () => {
  // feliz
  it('builds a Word file, with the document and the brand logo inside', async () => {
    const docx = await renderDocxDocument(definition());

    expect(docx.subarray(0, 2).toString()).toBe(ZIP_SIGNATURE);
    expect(docx.includes('word/document.xml')).toBe(true);
    expect(docx.includes('word/media/')).toBe(true);
  });

  it('carries a footer, where the page number goes', async () => {
    const docx = await renderDocxDocument(definition());

    expect(docx.includes('word/footer')).toBe(true);
  });

  // triste
  /* Uma tabela de uma coluna só ainda tem de sair como tabela de verdade, sem quebrar. */
  it('does not break on a record that has nothing but its title', async () => {
    const onlyTitle = definition({
      blocks: [
        {
          kind: 'table',
          headers: ['Protocolo'],
          rows: [[{ text: 'CH-0001' }]],
          titleColumnIndex: 0,
          emptyText: 'Nada.',
        },
      ],
    });

    await expect(renderDocxDocument(onlyTitle)).resolves.toBeInstanceOf(Buffer);
  });

  it('builds the file for a table with no rows and for a document with no blocks', async () => {
    const emptyTable = definition({
      blocks: [{ kind: 'table', headers: ['Protocolo'], rows: [], emptyText: 'Nada.' }],
    });

    await expect(renderDocxDocument(emptyTable)).resolves.toBeInstanceOf(Buffer);
    await expect(
      renderDocxDocument(definition({ blocks: [], subtitle: undefined })),
    ).resolves.toBeInstanceOf(Buffer);
  });
});
