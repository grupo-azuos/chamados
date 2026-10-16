import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { DOCUMENT_PALETTE, excelColor } from './document-palette.util';
import { renderXlsxDocument } from './document-xlsx.util';
import { type DocumentDefinition } from './document.type';

/* Layout fixo da planilha, o da Gestão de RH: faixa azul com o título (1–2) e o subtítulo com a
   data (3), fio amarelo (4), respiro (5) e os blocos a partir da 6 — num relatório, o cabeçalho
   da tabela é a linha 6 e os dados começam na 7. */
const TITLE_ROW = 1;
const SUBTITLE_ROW = 3;
const ACCENT_ROW = 4;
const HEADER_ROW = 6;
const FIRST_DATA_ROW = 7;

function definition(overrides: Partial<DocumentDefinition> = {}): DocumentDefinition {
  return {
    title: 'Chamados',
    subtitle: '2 chamados · gerado em 02/03/2026',
    reference: 'Chamados',
    orientation: 'landscape',
    blocks: [
      {
        kind: 'table',
        headers: ['Protocolo', 'Solicitante', 'Situação'],
        rows: [
          [{ text: 'CH-0001' }, { text: 'Bia Costa' }, { text: 'Aberto', tone: 'info' }],
          [{ text: 'CH-0002' }, { text: 'Caio Reis' }, { text: 'Resolvido', tone: 'success' }],
        ],
        emptyText: 'Nenhum registro encontrado com esse filtro.',
      },
    ],
    ...overrides,
  };
}

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
     `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois tipos. */
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  return workbook;
}

describe('renderXlsxDocument', () => {
  // feliz
  it('writes the title, the subtitle, the header and the rows where the layout says', async () => {
    const sheet = (await load(await renderXlsxDocument(definition()))).worksheets[0];

    expect(sheet?.getRow(TITLE_ROW).getCell(1).text).toBe('Chamados');
    expect(sheet?.getRow(SUBTITLE_ROW).getCell(1).text).toContain(
      '2 chamados · gerado em 02/03/2026',
    );
    expect(sheet?.getRow(HEADER_ROW).getCell(1).text).toBe('Protocolo');
    expect(sheet?.getRow(FIRST_DATA_ROW).getCell(2).text).toBe('Bia Costa');
    expect(sheet?.getRow(FIRST_DATA_ROW + 1).getCell(1).text).toBe('CH-0002');
  });

  it('draws the brand band: blue with the logo, the yellow line and the blue table header', async () => {
    const workbook = await load(await renderXlsxDocument(definition()));
    const sheet = workbook.worksheets[0];
    const fillOf = (row: number) =>
      (sheet?.getRow(row).getCell(1).fill as { fgColor?: { argb?: string } } | undefined)?.fgColor
        ?.argb;

    expect(sheet?.getImages()).toHaveLength(1);
    expect(fillOf(TITLE_ROW)).toBe(excelColor(DOCUMENT_PALETTE.primary));
    expect(fillOf(ACCENT_ROW)).toBe(excelColor(DOCUMENT_PALETTE.accent));
    expect(fillOf(HEADER_ROW)).toBe(excelColor(DOCUMENT_PALETTE.primary));
    expect(sheet?.getRow(HEADER_ROW).getCell(1).font?.name).toBe('Arial Narrow');
  });

  it('keeps the table header in sight, with a filter on it', async () => {
    const sheet = (await load(await renderXlsxDocument(definition()))).worksheets[0];

    expect(sheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: HEADER_ROW });
    expect(sheet?.autoFilter).toBeTruthy();
  });

  // triste
  it('writes the empty text when the table has no rows', async () => {
    const empty = definition({
      blocks: [{ kind: 'table', headers: ['Protocolo'], rows: [], emptyText: 'Nada por aqui.' }],
    });
    const sheet = (await load(await renderXlsxDocument(empty))).worksheets[0];

    const texts: string[] = [];
    sheet?.eachRow((row) => row.eachCell((cell) => texts.push(cell.text)));

    expect(texts).toContain('Nada por aqui.');
  });

  /* O nome da aba vem do título, e o Excel recusa `/ \ ? * [ ]` e nomes com mais de 31
     caracteres: o arquivo tem que sair do mesmo jeito. */
  it('builds the file even when the title has characters a sheet name refuses', async () => {
    const awkward = definition({
      title: 'Chamados: abertos/fechados [2026]? *todos* e mais um pouco',
    });

    const workbook = await load(await renderXlsxDocument(awkward));

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0]?.name.length).toBeLessThanOrEqual(31);
  });

  it('builds a sheet for a document with no blocks at all', async () => {
    const workbook = await load(await renderXlsxDocument(definition({ blocks: [] })));

    expect(workbook.worksheets[0]?.getRow(TITLE_ROW).getCell(1).text).toBe('Chamados');
  });
});
