import ExcelJS, { type Cell, type Worksheet } from 'exceljs';

import {
  BRAND_NAME,
  generatedAtLabel,
  isNumericColumn,
  LOGO_RATIO,
  LOGO_WHITE_PNG,
  OFFICE_FONT,
} from './document-brand.util';
import { DOCUMENT_PALETTE, DOCUMENT_TONE_SOFT_COLORS, excelColor } from './document-palette.util';
import {
  type DocumentBadge,
  type DocumentBlock,
  type DocumentCell,
  type DocumentDefinition,
  type DocumentEntry,
  type DocumentField,
  type DocumentVerification,
} from './document.type';

type TableBlock = Extract<DocumentBlock, { kind: 'table' }>;

/** A folha sendo escrita, e a próxima linha livre — os blocos vão um embaixo do outro. */
type SheetCursor = { sheet: Worksheet; columnCount: number; row: number };

type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
  fill?: string;
  horizontal?: 'left' | 'center' | 'right';
  wrapText?: boolean;
};

/** O nome da planilha aceita no máximo 31 caracteres e nenhum destes sinais — regra do Excel. */
const SHEET_NAME_MAX_LENGTH = 31;
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g;

const MIN_COLUMN_COUNT = 2;
const MIN_COLUMN_WIDTH = 14;
const MAX_COLUMN_WIDTH = 46;
const COLUMN_WIDTH_PADDING = 3;
/* Medir toda linha para achar a largura ideal fica caro numa lista de milhares — a amostra
   já cobre o que aparece na tela sem rolagem, que é o caso comum. */
const WIDTH_SAMPLE_SIZE = 200;
/* Sem tabela para medir, a primeira coluna é a dos rótulos e as outras, a do texto. */
const LABEL_COLUMN_WIDTH = 26;
const TEXT_COLUMN_WIDTH = 40;

const HEADER_ROW_HEIGHT = 22;
const DATA_ROW_HEIGHT = 20;
const TEXT_LINE_HEIGHT = 15;
/* Quantos caracteres cabem numa linha de texto corrido — o Excel não cresce sozinho a altura
   de uma célula mesclada, então a altura é estimada pelo tamanho do texto. */
const TEXT_LINE_LENGTH = 110;
/** A soma mínima das colunas: abaixo disso o título da faixa passa por cima da logo. */
const MIN_SHEET_WIDTH = 100;
const TEXT_SIZE = 11;

/**
 * O topo é a FAIXA DA MARCA, a mesma do Excel da Gestão de RH: três linhas azuis com a logo
 * branca no canto e o título à direita, um fio amarelo embaixo e uma linha de respiro. O
 * primeiro bloco começa sempre na mesma linha, tenha o documento subtítulo ou não.
 */
const ROWS = { bandStart: 1, bandEnd: 3, accent: 4, gap: 5 };
const FIRST_BLOCK_ROW = 6;
const BAND_ROW_HEIGHT = 22;
/** A logo no canto da faixa, em pixels: um bom tamanho para ler sem tomar a faixa inteira. */
const LOGO_WIDTH = 190;
const LOGO_OFFSET = { column: 0.2, row: 0.55 };

const THIN_GRID = { style: 'thin', color: { argb: excelColor(DOCUMENT_PALETTE.border) } } as const;
const CELL_BORDER = { top: THIN_GRID, bottom: THIN_GRID, left: THIN_GRID, right: THIN_GRID };

/**
 * O documento em Excel, com a cara da marca: faixa azul com a logo, fio amarelo, cabeçalho de
 * tabela azul com letra branca, linhas alternadas em azul bem claro e grade fina. O cabeçalho da
 * primeira tabela fica preso ao rolar, com filtro ligado, e a folha imprime numa página de largura.
 */
export async function renderXlsxDocument(definition: DocumentDefinition): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const now = definition.createdAt ?? new Date();
  workbook.created = now;
  workbook.creator = BRAND_NAME;
  workbook.title = definition.title;

  const sheet = workbook.addWorksheet(sheetNameOf(definition.title), {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: definition.orientation,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  const cursor: SheetCursor = {
    sheet,
    columnCount: columnCountOf(definition),
    row: FIRST_BLOCK_ROW,
  };

  sheet.columns = columnWidthsOf(definition, cursor.columnCount).map((width) => ({ width }));
  writeBand(cursor, definition, now);

  for (const block of definition.blocks) writeBlock(cursor, block);
  if (definition.verification) writeVerification(cursor, definition.verification);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function sheetNameOf(title: string): string {
  return title.replace(SHEET_NAME_FORBIDDEN, ' ').slice(0, SHEET_NAME_MAX_LENGTH);
}

function firstTableOf(definition: DocumentDefinition): TableBlock | undefined {
  return definition.blocks.find((block) => block.kind === 'table');
}

/** A planilha é tão larga quanto o bloco mais largo: a maior tabela ou a maior fila de selos. */
function columnCountOf(definition: DocumentDefinition): number {
  const widths = definition.blocks.map((block) => {
    if (block.kind === 'table') return block.headers.length;
    if (block.kind === 'badges') return block.items.length;

    return MIN_COLUMN_COUNT;
  });

  return Math.max(MIN_COLUMN_COUNT, ...widths);
}

/** A largura pelo conteúdo de verdade, não só pelo título da coluna — sem isso "Em atendimento" corta. */
/**
 * Cada coluna na largura do maior texto dela, dentro de um mínimo e um máximo. Quando a soma fica
 * estreita demais para a faixa (logo de um lado, título do outro), o que falta é dividido por
 * igual entre as colunas.
 */
function columnWidthsOf(definition: DocumentDefinition, columnCount: number): number[] {
  const table = firstTableOf(definition);
  const widths = Array.from({ length: columnCount }, (_, index) => {
    const header = table?.headers[index];
    if (table && header !== undefined) return measuredWidth(header, table.rows, index);

    return index === 0 ? LABEL_COLUMN_WIDTH : TEXT_COLUMN_WIDTH;
  });

  const missing = MIN_SHEET_WIDTH - widths.reduce((sum, width) => sum + width, 0);
  if (missing <= 0) return widths;

  return widths.map((width) => width + Math.ceil(missing / widths.length));
}

function measuredWidth(header: string, rows: DocumentCell[][], columnIndex: number): number {
  const longestValue = rows
    .slice(0, WIDTH_SAMPLE_SIZE)
    .reduce((max, row) => Math.max(max, row[columnIndex]?.text.length ?? 0), 0);
  const width = Math.max(header.length, longestValue) + COLUMN_WIDTH_PADDING;

  return Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
}

/**
 * O topo da planilha: a logo no canto, o título centralizado na cor principal do tema e um fio
 * da mesma cor embaixo — o mesmo cabeçalho do PDF e do Word. O fundo é branco de propósito: a
 * logo é colorida, e sobre uma faixa cheia ela perderia o contorno.
 */
/** A faixa azul com a logo no canto esquerdo e o título do documento à direita. */
function writeBand(cursor: SheetCursor, definition: DocumentDefinition, now: Date): void {
  const { sheet, columnCount } = cursor;

  for (let row = ROWS.bandStart; row <= ROWS.bandEnd; row += 1) {
    sheet.getRow(row).height = BAND_ROW_HEIGHT;
    paintRow(cursor, row, DOCUMENT_PALETTE.primary);
  }
  sheet.getRow(ROWS.accent).height = 3;
  paintRow(cursor, ROWS.accent, DOCUMENT_PALETTE.accent);
  sheet.getRow(ROWS.gap).height = 8;

  sheet.mergeCells(ROWS.bandStart, 1, ROWS.bandStart + 1, columnCount);
  const title = sheet.getCell(ROWS.bandStart, 1);
  title.value = definition.title;
  title.font = { name: OFFICE_FONT, size: 16, bold: true, color: { argb: excelColor('FFFFFF') } };
  title.alignment = { horizontal: 'right', vertical: 'bottom', indent: 1 };

  sheet.mergeCells(ROWS.bandEnd, 1, ROWS.bandEnd, columnCount);
  const details = sheet.getCell(ROWS.bandEnd, 1);
  details.value = bandDetails(definition.subtitle, now);
  details.font = { name: OFFICE_FONT, size: 10, color: { argb: excelColor('FFFFFF') } };
  details.alignment = { horizontal: 'right', vertical: 'top', indent: 1 };

  writeBrandLogo(cursor);
}

/* O subtítulo e a data em que o arquivo saiu. O subtítulo do relatório já diz "gerado em": não
   repete. */
function bandDetails(subtitle: string | undefined, now: Date): string {
  if (subtitle && /gerado em/i.test(subtitle)) return subtitle;

  return [subtitle, generatedAtLabel(now)].filter(Boolean).join('  ·  ');
}

function paintRow(cursor: SheetCursor, row: number, color: string): void {
  for (let column = 1; column <= cursor.columnCount; column += 1) {
    cursor.sheet.getCell(row, column).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelColor(color) },
    };
  }
}

function writeBrandLogo(cursor: SheetCursor): void {
  /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
     `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois tipos. */
  const imageId = cursor.sheet.workbook.addImage({
    buffer: LOGO_WHITE_PNG as unknown as ExcelJS.Buffer,
    extension: 'png',
  });

  cursor.sheet.addImage(imageId, {
    tl: { col: LOGO_OFFSET.column, row: LOGO_OFFSET.row },
    ext: { width: LOGO_WIDTH, height: LOGO_WIDTH / LOGO_RATIO },
    editAs: 'absolute',
  });
}

function writeBlock(cursor: SheetCursor, block: DocumentBlock): void {
  switch (block.kind) {
    case 'heading':
      return writeHeading(cursor, block.text);
    case 'paragraph':
      return writeText(cursor, block.text, {});
    case 'badges':
      return writeBadges(cursor, block.items);
    case 'fields':
      return block.items.forEach((field) => writeField(cursor, field));
    case 'entries':
      return writeEntries(cursor, block.items, block.emptyText);
    case 'table':
      return writeTable(cursor, block);
  }
}

function writeHeading(cursor: SheetCursor, text: string): void {
  /* Uma linha em branco antes, para o título de seção não colar no bloco de cima. */
  if (cursor.row > FIRST_BLOCK_ROW) cursor.row += 1;

  writeMergedRow(cursor, cursor.row, text, {
    bold: true,
    size: 13,
    color: DOCUMENT_PALETTE.primary,
  });
  cursor.sheet.getRow(cursor.row).height = 24;
  cursor.row += 1;
}

/** Texto corrido: uma linha mesclada de ponta a ponta, com a altura estimada pelo tamanho. */
function writeText(cursor: SheetCursor, text: string, style: TextStyle): void {
  writeMergedRow(cursor, cursor.row, text, { ...style, wrapText: true });

  const lineCount = text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / TEXT_LINE_LENGTH)), 0);
  cursor.sheet.getRow(cursor.row).height = lineCount * TEXT_LINE_HEIGHT;
  cursor.row += 1;
}

function writeBadges(cursor: SheetCursor, badges: DocumentBadge[]): void {
  badges.forEach((badge, index) => {
    const cell = cursor.sheet.getCell(cursor.row, index + 1);
    cell.value = badge.text;
    styleBadgeCell(cell, badge.tone);
  });
  cursor.sheet.getRow(cursor.row).height = DATA_ROW_HEIGHT;
  cursor.row += 1;
}

function styleBadgeCell(cell: Cell, tone: DocumentBadge['tone']): void {
  const colors = DOCUMENT_TONE_SOFT_COLORS[tone];

  styleCell(cell, { bold: true, color: colors.text, fill: colors.fill, horizontal: 'center' });
}

/** "Rótulo" na primeira coluna e o valor ocupando o resto da largura. */
function writeField(cursor: SheetCursor, field: DocumentField): void {
  const label = cursor.sheet.getCell(cursor.row, 1);
  label.value = field.label;
  styleCell(label, { bold: true, color: DOCUMENT_PALETTE.subtext });

  writeRestOfRow(cursor, field.value, {});
  cursor.row += 1;
}

/** Escreve da segunda coluna até a última, mesclando — o par da célula da primeira coluna. */
function writeRestOfRow(cursor: SheetCursor, text: string, style: TextStyle): void {
  if (cursor.columnCount > MIN_COLUMN_COUNT) {
    cursor.sheet.mergeCells(cursor.row, MIN_COLUMN_COUNT, cursor.row, cursor.columnCount);
  }

  const cell = cursor.sheet.getCell(cursor.row, MIN_COLUMN_COUNT);
  cell.value = text;
  styleCell(cell, style);
}

function writeEntries(cursor: SheetCursor, entries: DocumentEntry[], emptyText: string): void {
  if (entries.length === 0) return writeText(cursor, emptyText, EMPTY_STATE_STYLE);

  entries.forEach((entry) => writeEntry(cursor, entry));
}

function writeEntry(cursor: SheetCursor, entry: DocumentEntry): void {
  const badge = cursor.sheet.getCell(cursor.row, 1);
  badge.value = entry.badge.text;
  styleBadgeCell(badge, entry.badge.tone);
  writeRestOfRow(cursor, entry.caption, { bold: true });
  cursor.row += 1;

  writeText(cursor, entry.details, { size: 9, color: DOCUMENT_PALETTE.subtext });
  writeText(cursor, entry.body, {});
  if (entry.note)
    writeText(cursor, entry.note, { size: 9, italic: true, color: DOCUMENT_PALETTE.subtext });

  cursor.row += 1;
}

const EMPTY_STATE_STYLE: TextStyle = { italic: true, color: DOCUMENT_PALETTE.subtext };

function writeTable(cursor: SheetCursor, block: TableBlock): void {
  const headerRow = cursor.row;
  writeHeaderRow(cursor, block.headers);

  /* Só o cabeçalho da primeira tabela fica preso, com filtro e repetido na impressão: é o que
     fica à vista ao rolar a lista. */
  const isFirstTable = cursor.sheet.views[0]?.state !== 'frozen';
  if (isFirstTable) {
    cursor.sheet.views = [{ state: 'frozen', ySplit: headerRow, showGridLines: false }];
    cursor.sheet.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
  }

  if (block.rows.length === 0) return writeEmptyRow(cursor, block.emptyText);

  const numeric = block.headers.map((_, index) => isNumericColumn(block.rows, index));
  block.rows.forEach((row, index) => writeDataRow(cursor, row, index, numeric));

  /* O filtro só faz sentido com linha para filtrar. */
  if (isFirstTable) {
    cursor.sheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: cursor.row - 1, column: block.headers.length },
    };
  }
}

function writeHeaderRow(cursor: SheetCursor, headers: string[]): void {
  const row = cursor.sheet.getRow(cursor.row);
  row.height = HEADER_ROW_HEIGHT;

  headers.forEach((header, index) => {
    const cell = row.getCell(index + 1);
    cell.value = header;
    styleCell(cell, {
      bold: true,
      color: DOCUMENT_PALETTE.primaryForeground,
      fill: DOCUMENT_PALETTE.primary,
      wrapText: true,
    });
    cell.border = CELL_BORDER;
  });
  cursor.row += 1;
}

/* Tabela vazia é UMA linha dizendo isso: só o cabeçalho, sem linha nenhuma, parece defeito. */
function writeEmptyRow(cursor: SheetCursor, text: string): void {
  writeMergedRow(cursor, cursor.row, text, { ...EMPTY_STATE_STYLE, horizontal: 'center' });
  cursor.sheet.getCell(cursor.row, 1).border = CELL_BORDER;
  cursor.sheet.getRow(cursor.row).height = DATA_ROW_HEIGHT;
  cursor.row += 1;
}

function writeDataRow(
  cursor: SheetCursor,
  cells: DocumentCell[],
  index: number,
  numeric: boolean[],
): void {
  const row = cursor.sheet.getRow(cursor.row);
  /* Linhas alternadas em azul bem claro, como no Excel da Gestão de RH. */
  const fill = index % 2 === 1 ? DOCUMENT_PALETTE.surfaceAlt : undefined;

  cells.forEach((value, columnIndex) => {
    const cell = row.getCell(columnIndex + 1);
    const toneColor = value.tone ? DOCUMENT_TONE_SOFT_COLORS[value.tone].text : undefined;
    cell.value = value.text;
    styleCell(cell, {
      bold: Boolean(toneColor),
      color: toneColor,
      fill,
      horizontal: numeric[columnIndex] ? 'right' : 'left',
      wrapText: true,
    });
    cell.alignment = { ...cell.alignment, vertical: 'top' };
    cell.border = CELL_BORDER;
  });
  cursor.row += 1;
}

/** A conferência por extenso: sem QR code, o link clicável (o inteiro) resolve. */
function writeVerification(cursor: SheetCursor, verification: DocumentVerification): void {
  writeHeading(cursor, 'Conferência do documento');
  verification.lines.forEach((line) => {
    writeText(cursor, line, { size: 9, color: DOCUMENT_PALETTE.subtext });
  });

  writeMergedRow(cursor, cursor.row, verification.displayUrl, { color: DOCUMENT_PALETTE.primary });
  cursor.sheet.getCell(cursor.row, 1).value = {
    text: verification.displayUrl,
    hyperlink: verification.url,
  };
  cursor.row += 1;
}

function writeMergedRow(
  cursor: SheetCursor,
  rowIndex: number,
  text: string,
  style: TextStyle,
): void {
  cursor.sheet.mergeCells(rowIndex, 1, rowIndex, cursor.columnCount);
  const cell = cursor.sheet.getCell(rowIndex, 1);
  cell.value = text;
  styleCell(cell, style);
}

/** O ÚNICO lugar que decide fonte, cor e alinhamento de uma célula. */
function styleCell(cell: Cell, style: TextStyle): void {
  const isCentered = style.horizontal === 'center';

  cell.font = {
    name: OFFICE_FONT,
    bold: style.bold,
    italic: style.italic,
    size: style.size ?? TEXT_SIZE,
    color: { argb: excelColor(style.color ?? DOCUMENT_PALETTE.foreground) },
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: style.horizontal ?? 'left',
    indent: isCentered || style.horizontal === 'right' ? 0 : 1,
    wrapText: style.wrapText,
  };
  if (!style.fill) return;

  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColor(style.fill) } };
}
