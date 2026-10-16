import { join } from 'node:path';

import pdfMake from 'pdfmake';
import {
  type Column,
  type Content,
  type CustomTableLayout,
  type TableCell,
  type TDocumentDefinitions,
} from 'pdfmake/interfaces';

import {
  BRAND_NAME,
  generatedAtLabel,
  isNumericColumn,
  LOGO_BLUE_SVG,
  pageOrientationOf,
  PDF_FONT,
} from './document-brand.util';
import {
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_COLORS,
  DOCUMENT_TONE_SOFT_COLORS,
  pdfColor,
} from './document-palette.util';
import {
  type DocumentBadge,
  type DocumentBlock,
  type DocumentCell,
  type DocumentDefinition,
  type DocumentEntry,
  type DocumentField,
  type DocumentVerification,
} from './document.type';

/* As fontes moram ao lado deste arquivo — o build do Nest as copia para o `dist` (ver `assets`
   em nest-cli.json), então o mesmo caminho vale em desenvolvimento e em produção. */
const FONTS_DIRECTORY = join(__dirname, 'fonts');

/**
 * As medidas do PAPEL TIMBRADO da casa, as mesmas da Gestão de RH: tiradas do modelo em Word
 * que a Azuos usa nas declarações (A4, margens de 3 cm, logo centralizada no topo, faixa azul no
 * pé, texto em Arial Narrow 12, título em 15 negrito centralizado, tabela de fio preto fino com
 * cabeçalho em negrito). Mudar um número aqui é sair do padrão dos outros documentos da empresa.
 *
 * Tudo em pontos (1 pt = 1/72 de polegada), que é a unidade do PDF.
 */
const A4 = { short: 595.28, long: 841.89 };
const MARGIN = { side: 85.05, top: 85.05, bottom: 106.35 };
const LOGO = { width: 145.6, top: 17.6 };
/** A faixa do pé, medida de baixo para cima: assim ela fica no lugar com a folha em pé ou deitada. */
const FOOTER_BAR = { fromBottom: 84.99, height: 38.7 };
const FOOTER_FONT_SIZE = 9;
const TITLE_SIZE = 15;
const TEXT_SIZE = 12;
const SMALL_SIZE = 10;
const TINY_SIZE = 8;
/** O espaço de dentro da célula do modelo: 0,19 cm de cada lado, quase nada em cima e embaixo. */
const CELL_PADDING = { side: 5.4, vertical: 1 };
const LINE_WIDTH = 0.5;
const QR_CODE_SIZE = 56;
const FIELDS_PER_ROW = 2;

const COLOR = {
  primary: pdfColor(DOCUMENT_PALETTE.primary),
  ink: pdfColor(DOCUMENT_PALETTE.foreground),
  subtext: pdfColor(DOCUMENT_PALETTE.subtext),
  white: pdfColor(DOCUMENT_PALETTE.primaryForeground),
} as const;

pdfMake.setFonts({
  [PDF_FONT]: {
    normal: join(FONTS_DIRECTORY, 'LiberationSansNarrow-Regular.ttf'),
    bold: join(FONTS_DIRECTORY, 'LiberationSansNarrow-Bold.ttf'),
    italics: join(FONTS_DIRECTORY, 'LiberationSansNarrow-Italic.ttf'),
    bolditalics: join(FONTS_DIRECTORY, 'LiberationSansNarrow-BoldItalic.ttf'),
  },
});
/* O documento nunca busca nada na internet, e do disco só lê o que é dele (fontes e logo):
   um texto vindo de um chamado não consegue fazer o gerador abrir outro arquivo. */
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((path) => path.startsWith(__dirname));

type PageSize = { width: number; height: number };
type TableBlock = Extract<DocumentBlock, { kind: 'table' }>;

/**
 * O documento em PDF, no papel timbrado: a logo e a faixa azul vão no FUNDO de toda página, o
 * título em maiúsculas no centro e, no pé, de onde veio o documento, quando foi gerado e a
 * página. Quebra de página, cabeçalho de tabela repetido e altura de linha são do pdfmake.
 *
 * O desenho não lê o relógio (a data vem de `createdAt`) nem sorteia nada: a mesma definição
 * dá o mesmo arquivo, byte a byte.
 */
export async function renderPdfDocument(definition: DocumentDefinition): Promise<Buffer> {
  const generatedAt = generatedAtLabel(definition.createdAt ?? new Date());
  const orientation = pageOrientationOf(definition);
  /* O espaço entre as margens, de onde sai a largura de cada coluna das tabelas. */
  const frame = (orientation === 'landscape' ? A4.long : A4.short) - MARGIN.side * 2;
  const pdfDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: orientation,
    pageMargins: [MARGIN.side, MARGIN.top, MARGIN.side, MARGIN.bottom],
    info: {
      title: definition.title,
      author: 'Grupo Azuos',
      creator: BRAND_NAME,
      creationDate: definition.createdAt ?? new Date(),
    },
    defaultStyle: { font: PDF_FONT, fontSize: TEXT_SIZE, color: COLOR.ink, lineHeight: 1.1 },
    background: (_page, size) => drawLetterhead(size as PageSize),
    footer: (currentPage, pageCount) =>
      drawFooter(definition.reference, `${generatedAt} · Página ${currentPage} de ${pageCount}`),
    content: [
      ...drawTitle(definition),
      ...definition.blocks.map((block) => drawBlock(block, frame)),
      ...(definition.verification ? [drawVerification(definition.verification)] : []),
    ],
  };

  return pdfMake.createPdf(pdfDefinition).getBuffer();
}

function drawTitle(definition: DocumentDefinition): Content[] {
  const title: Content = {
    text: definition.title.toLocaleUpperCase('pt-BR'),
    fontSize: TITLE_SIZE,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 4],
  };
  if (!definition.subtitle) return [{ ...title, margin: [0, 0, 0, 10] }];

  return [title, { text: definition.subtitle, alignment: 'center', margin: [0, 0, 0, 10] }];
}

/** O timbrado vai no FUNDO de toda página: a logo no topo e a faixa azul no pé. */
function drawLetterhead(page: PageSize): Content {
  return [
    {
      svg: LOGO_BLUE_SVG,
      width: LOGO.width,
      absolutePosition: { x: (page.width - LOGO.width) / 2, y: LOGO.top },
    },
    {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: page.height - FOOTER_BAR.fromBottom,
          w: page.width,
          h: FOOTER_BAR.height,
          color: COLOR.primary,
        },
      ],
      absolutePosition: { x: 0, y: 0 },
    },
  ];
}

/**
 * O que vai escrito na faixa do pé: de onde veio o documento, quando foi gerado e a página. A
 * área do rodapé começa onde a margem de baixo começa; o recuo de cima desce o texto até o meio
 * da faixa.
 */
function drawFooter(reference: string, right: string): Content {
  const lineHeight = FOOTER_FONT_SIZE * 1.1;
  const top = MARGIN.bottom - FOOTER_BAR.fromBottom + (FOOTER_BAR.height - lineHeight) / 2;

  return {
    margin: [28, top, 28, 0],
    fontSize: FOOTER_FONT_SIZE,
    color: COLOR.white,
    columns: [
      { text: `${BRAND_NAME} · ${reference}`, bold: true },
      { text: right, alignment: 'right', width: 'auto' },
    ],
  };
}

function drawBlock(block: DocumentBlock, frame: number): Content {
  switch (block.kind) {
    case 'heading':
      return drawHeading(block.text);
    case 'paragraph':
      return { text: block.text, margin: [0, 0, 0, 6] };
    case 'badges':
      return { columns: block.items.map(drawBadge), columnGap: 6, margin: [0, 0, 0, 8] };
    case 'fields':
      return drawFields(block.items);
    case 'entries':
      return drawEntries(block.items, block.emptyText);
    case 'table':
      return drawTable(block, frame);
  }
}

/* O título da seção anda junto com o que vem embaixo: sozinho no pé de uma página, fica órfão. */
function drawHeading(text: string): Content {
  return { text, bold: true, margin: [0, 10, 0, 4], headlineLevel: 1 };
}

/** A etiqueta isolada: um retângulo do tamanho do texto, com o fundo suave da situação. */
function drawBadge(badge: DocumentBadge): Column {
  const colors = DOCUMENT_TONE_SOFT_COLORS[badge.tone];

  return {
    width: 'auto',
    table: {
      body: [
        [
          {
            text: badge.text,
            fontSize: SMALL_SIZE,
            bold: true,
            color: pdfColor(colors.text),
            fillColor: pdfColor(colors.fill),
            margin: [3, 0, 3, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
  };
}

/** Os pares "rótulo: valor" em duas colunas, na mesma tabela de fio preto do modelo. */
function drawFields(fields: DocumentField[]): Content {
  const rows: TableCell[][] = [];

  for (let index = 0; index < fields.length; index += FIELDS_PER_ROW) {
    rows.push(fields.slice(index, index + FIELDS_PER_ROW).flatMap(drawField));
  }

  /* Um campo sozinho na última linha: completa com células vazias, senão a tabela não fecha. */
  const lastRow = rows.at(-1);
  if (lastRow && lastRow.length < FIELDS_PER_ROW * 2) lastRow.push({}, {});
  if (rows.length === 0) return { text: '' };

  return {
    margin: [0, 0, 0, 6],
    table: { widths: ['auto', '*', 'auto', '*'], body: rows, dontBreakRows: true },
    layout: MODEL_TABLE,
  };
}

function drawField(field: DocumentField): TableCell[] {
  return [{ text: field.label, bold: true }, { text: field.value }];
}

function drawEntries(entries: DocumentEntry[], emptyText: string): Content {
  if (entries.length === 0) return drawEmptyState(emptyText);

  return { stack: entries.map(drawEntry) };
}

/** Um passo da linha do tempo, com uma barra da cor da situação na lateral. */
function drawEntry(entry: DocumentEntry): Content {
  const lines: Content[] = [
    {
      columns: [drawBadge(entry.badge), { text: entry.caption, bold: true, margin: [0, 1, 0, 0] }],
      columnGap: 6,
    },
    { text: entry.details, fontSize: SMALL_SIZE, color: COLOR.subtext, margin: [0, 2, 0, 2] },
    { text: entry.body },
  ];
  if (entry.note) {
    lines.push({
      text: entry.note,
      fontSize: SMALL_SIZE,
      italics: true,
      color: COLOR.subtext,
      margin: [0, 2, 0, 0],
    });
  }

  const barColor = pdfColor(DOCUMENT_TONE_COLORS[entry.badge.tone].fill);

  return {
    margin: [0, 0, 0, 8],
    unbreakable: true,
    table: { widths: ['*'], body: [[{ stack: lines }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (index) => (index === 0 ? 2 : 0),
      vLineColor: () => barColor,
      paddingLeft: () => 8,
      paddingRight: () => 0,
      paddingTop: () => 1,
      paddingBottom: () => 1,
    },
  };
}

/** A tabela do modelo: todas as linhas em fio preto fino, sem fundo. */
const MODEL_TABLE: CustomTableLayout = {
  hLineWidth: () => LINE_WIDTH,
  vLineWidth: () => LINE_WIDTH,
  hLineColor: () => COLOR.ink,
  vLineColor: () => COLOR.ink,
  paddingLeft: () => CELL_PADDING.side,
  paddingRight: () => CELL_PADDING.side,
  paddingTop: () => CELL_PADDING.vertical,
  paddingBottom: () => CELL_PADDING.vertical,
};

function drawTable(block: TableBlock, frame: number): Content {
  const { headers, rows, emptyText } = block;

  return {
    fontSize: tableFontSize(headers.length),
    table: {
      /* O cabeçalho se repete em toda página, e uma linha nunca é cortada ao meio. */
      headerRows: 1,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
      widths: columnWidths(headers, rows, frame),
      body: [
        headers.map((header): TableCell => ({ text: header, bold: true })),
        ...bodyRows(headers.length, rows, emptyText),
      ],
    },
    layout: MODEL_TABLE,
  };
}

/* Tabela vazia é UMA linha dizendo isso: só o cabeçalho, sem linha nenhuma, parece defeito. */
function bodyRows(count: number, rows: DocumentCell[][], emptyText: string): TableCell[][] {
  if (rows.length === 0) {
    const blanks = Array.from({ length: count - 1 }, (): TableCell => ({}));

    return [[{ text: emptyText, colSpan: count, alignment: 'center', italics: true }, ...blanks]];
  }

  const numeric = Array.from({ length: count }, (_, index) => isNumericColumn(rows, index));

  return rows.map((row) =>
    Array.from({ length: count }, (_, index) =>
      drawCell(row[index] ?? { text: '' }, numeric[index] ?? false),
    ),
  );
}

function drawCell(cell: DocumentCell, isNumeric: boolean): TableCell {
  const alignment = isNumeric ? 'right' : 'left';
  if (!cell.tone) return { text: cell.text, alignment };

  return {
    text: cell.text,
    alignment,
    bold: true,
    color: pdfColor(DOCUMENT_TONE_SOFT_COLORS[cell.tone].text),
  };
}

const WEIGHT = { min: 5, textCap: 22 };
/**
 * Quanto ocupa uma letra da Liberation Sans Narrow, em fração do corpo — com folga para o
 * negrito do cabeçalho. É a medida que garante a maior palavra de cada coluna inteira.
 */
const CHARACTER_WIDTH = 0.5;

/**
 * Cada coluna recebe PRIMEIRO o espaço da maior palavra dela — coluna mais estreita que uma
 * palavra a parte no meio ("Protoc-olo"), e data quebrada em duas linhas não se lê. O que sobra
 * da folha é dividido pelo que cada coluna ainda carrega além disso: a de nomes fica larga, a de
 * datas, estreita.
 */
function columnWidths(headers: string[], rows: DocumentCell[][], frame: number): number[] {
  const fontSize = tableFontSize(headers.length);
  const measures = headers.map((header, index) => {
    const texts = [header, ...rows.map((row) => row[index]?.text ?? '')];
    const longestText = Math.max(...texts.map((text) => text.length));
    const longestWord = Math.max(
      WEIGHT.min,
      ...texts.flatMap((text) => text.split(/\s+/)).map((word) => word.length),
    );

    return {
      word: longestWord,
      extra: Math.max(0, Math.min(longestText, WEIGHT.textCap) - longestWord),
    };
  });
  /* O que sobra para o texto, descontados o respiro e os fios de cada coluna. */
  const columns = headers.length;
  const available = frame - columns * CELL_PADDING.side * 2 - (columns + 1) * LINE_WIDTH;
  const words = measures.map((measure) => measure.word * fontSize * CHARACTER_WIDTH);
  const wordsTotal = words.reduce((sum, width) => sum + width, 0);
  /* Nem as palavras cabem: divide a folha na proporção delas, o melhor que dá. */
  if (wordsTotal >= available) return words.map((width) => (available * width) / wordsTotal);

  const extraTotal = measures.reduce((sum, measure) => sum + measure.extra, 0);
  const spare = available - wordsTotal;

  return words.map((width, index) => {
    const extra = measures[index]?.extra ?? 0;

    return width + (extraTotal === 0 ? spare / columns : (spare * extra) / extraTotal);
  });
}

/**
 * O modelo usa corpo 12. Tabela com muitas colunas não cabe entre as margens de 3 cm nesse
 * tamanho, então a letra desce — só dentro dela; título e texto continuam em 12.
 */
function tableFontSize(columns: number): number {
  if (columns <= 5) return TEXT_SIZE;

  return columns <= 8 ? SMALL_SIZE : TINY_SIZE;
}

function drawEmptyState(text: string): Content {
  return { text, italics: true, color: COLOR.subtext, margin: [0, 6, 0, 6] };
}

/**
 * A conferência, no fim do documento: o QR code leva o link CURTO (o inteiro ficaria miúdo
 * demais para a câmera ler) e o texto ao lado é clicável com o link INTEIRO.
 */
function drawVerification(verification: DocumentVerification): Content {
  return {
    unbreakable: true,
    margin: [0, 14, 0, 0],
    table: {
      widths: [QR_CODE_SIZE, '*'],
      body: [
        [
          { qr: verification.displayUrl, fit: QR_CODE_SIZE, eccLevel: 'M' },
          {
            fontSize: SMALL_SIZE,
            color: COLOR.subtext,
            margin: [6, 0, 0, 0],
            stack: [
              { text: 'Conferência do documento', bold: true, color: COLOR.ink },
              ...verification.lines,
              {
                text: verification.displayUrl,
                link: verification.url,
                color: COLOR.primary,
                decoration: 'underline',
              },
            ],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: (index) => (index === 0 ? LINE_WIDTH : 0),
      vLineWidth: () => 0,
      hLineColor: () => COLOR.ink,
      paddingLeft: () => 0,
      paddingTop: () => 8,
    },
  };
}
