import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  type ISectionOptions,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';

import {
  BRAND_NAME,
  generatedAtLabel,
  isNumericColumn,
  LOGO_BLUE_PNG,
  logoHeightFor,
  OFFICE_FONT,
  pageOrientationOf,
} from './document-brand.util';
import {
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_COLORS,
  DOCUMENT_TONE_SOFT_COLORS,
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

type DocxChild = Paragraph | Table;
type TableBlock = Extract<DocumentBlock, { kind: 'table' }>;

/**
 * O PAPEL TIMBRADO da casa em Word — as mesmas medidas do PDF (e do modelo de onde elas
 * saíram): A4, margens de 3 cm, logo azul centralizada no cabeçalho, faixa azul no pé, Arial
 * Narrow 12, título em 15 negrito centralizado e tabela de fio preto fino com cabeçalho em
 * negrito.
 *
 * O Word mede em TWIPS (1/20 de ponto) e o tamanho da letra em MEIOS pontos.
 */
const PT = 20;
const MARGIN = { side: Math.round(85.05 * PT), top: Math.round(85.05 * PT) };
/* A margem de baixo e a distância do rodapé põem a faixa azul na mesma altura da do PDF. */
const MARGIN_BOTTOM = Math.round(106.35 * PT);
const HEADER_DISTANCE = Math.round(17.6 * PT);
/* A faixa do pé: 38,7 pt de altura, com a base a 46,3 pt da borda de baixo — a do PDF. */
const FOOTER_DISTANCE = Math.round(46.29 * PT);
const FOOTER_BAR_HEIGHT = Math.round(38.7 * PT);
const FOOTER_INSET = Math.round(28 * PT);
/** A largura da folha A4, em twips: a faixa do pé vai de uma borda à outra. */
const A4_WIDTH = { portrait: 11906, landscape: 16838 };
/** A logo no cabeçalho, em pixels (a unidade que a biblioteca pede para imagem). */
const LOGO_WIDTH = 194;

const TEXT_SIZE = 24;
const SMALL_SIZE = 20;
const TITLE_SIZE = 30;
const FOOTER_SIZE = 18;
/** O espaço de dentro da célula do modelo: 0,19 cm de cada lado. */
const CELL_MARGIN = { side: 108, vertical: 20 };
const FULL_WIDTH_PERCENT = 100;
const BADGE_SEPARATOR = '   ·   ';

/** O fio do modelo: preto, fino (0,5 pt — a biblioteca mede em oitavos de ponto). */
const MODEL_LINE = { style: BorderStyle.SINGLE, size: 4, color: DOCUMENT_PALETTE.foreground };
const NO_LINE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: NO_LINE,
  bottom: NO_LINE,
  left: NO_LINE,
  right: NO_LINE,
  insideHorizontal: NO_LINE,
  insideVertical: NO_LINE,
};
const MODEL_BORDERS = {
  top: MODEL_LINE,
  bottom: MODEL_LINE,
  left: MODEL_LINE,
  right: MODEL_LINE,
  insideHorizontal: MODEL_LINE,
  insideVertical: MODEL_LINE,
};

/**
 * O documento em Word. É o mesmo conteúdo do PDF, no mesmo papel: quem precisa editar antes de
 * mandar abre este e encontra a página igual à que imprimiria.
 */
export async function renderDocxDocument(definition: DocumentDefinition): Promise<Buffer> {
  const generatedAt = generatedAtLabel(definition.createdAt ?? new Date());
  const pageWidth = A4_WIDTH[pageOrientationOf(definition)];
  const section: ISectionOptions = {
    properties: {
      page: {
        size: { orientation: orientationOf(definition) },
        margin: {
          top: MARGIN.top,
          right: MARGIN.side,
          bottom: MARGIN_BOTTOM,
          left: MARGIN.side,
          header: HEADER_DISTANCE,
          footer: FOOTER_DISTANCE,
        },
      },
    },
    headers: { default: writeLetterheadHeader() },
    footers: { default: writeFooter(definition.reference, generatedAt, pageWidth) },
    children: [
      ...writeTitle(definition.title, definition.subtitle),
      ...definition.blocks.flatMap(writeBlock),
      ...(definition.verification ? writeVerification(definition.verification) : []),
    ],
  };

  const document = new Document({
    title: definition.title,
    creator: BRAND_NAME,
    styles: {
      default: {
        document: {
          run: { font: OFFICE_FONT, size: TEXT_SIZE, color: DOCUMENT_PALETTE.foreground },
        },
      },
    },
    sections: [section],
  });

  return Packer.toBuffer(document);
}

function orientationOf(definition: DocumentDefinition) {
  if (pageOrientationOf(definition) === 'landscape') return PageOrientation.LANDSCAPE;

  return PageOrientation.PORTRAIT;
}

/** A logo azul, centralizada no topo de toda página. */
function writeLetterheadHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: 'png',
            data: LOGO_BLUE_PNG,
            transformation: { width: LOGO_WIDTH, height: logoHeightFor(LOGO_WIDTH) },
            altText: { name: BRAND_NAME, title: BRAND_NAME, description: 'Logo do Grupo Azuos' },
          }),
        ],
      }),
    ],
  });
}

/**
 * A faixa azul do pé, de uma borda da folha à outra (uma tabela recuada para dentro da margem):
 * de onde veio o documento à esquerda; quando foi gerado e a página à direita.
 */
function writeFooter(reference: string, generatedAt: string, pageWidth: number): Footer {
  const half = Math.round(pageWidth / 2);
  const band = new Table({
    width: { size: pageWidth, type: WidthType.DXA },
    columnWidths: [half, pageWidth - half],
    indent: { size: -MARGIN.side, type: WidthType.DXA },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        height: { value: FOOTER_BAR_HEIGHT, rule: HeightRule.EXACT },
        children: [
          writeFooterCell(AlignmentType.LEFT, [
            writeFooterRun(`${BRAND_NAME} · ${reference}`, true),
          ]),
          /* Um trecho por pedaço, cada um com o seu tamanho: num trecho só, o número da página
             (que é um campo calculado) saía no tamanho padrão, maior que o texto em volta. */
          writeFooterCell(AlignmentType.RIGHT, [
            writeFooterRun(`${generatedAt} · Página `),
            writeFooterRun(PageNumber.CURRENT),
            writeFooterRun(' de '),
            writeFooterRun(PageNumber.TOTAL_PAGES),
          ]),
        ],
      }),
    ],
  });

  return new Footer({ children: [band] });
}

function writeFooterCell(
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  runs: TextRun[],
): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: DOCUMENT_PALETTE.primary, color: 'auto' },
    verticalAlign: VerticalAlignTable.CENTER,
    borders: NO_BORDERS,
    margins: { left: FOOTER_INSET, right: FOOTER_INSET },
    children: [new Paragraph({ alignment, children: runs })],
  });
}

function writeFooterRun(content: string, bold = false): TextRun {
  return new TextRun({ children: [content], size: FOOTER_SIZE, bold, color: 'FFFFFF' });
}

function writeTitle(title: string, subtitle: string | undefined): Paragraph[] {
  const paragraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: subtitle ? 80 : 200 },
      children: [
        new TextRun({ text: title.toLocaleUpperCase('pt-BR'), bold: true, size: TITLE_SIZE }),
      ],
    }),
  ];
  if (!subtitle) return paragraphs;

  return [
    ...paragraphs,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: subtitle })],
    }),
  ];
}

function writeBlock(block: DocumentBlock): DocxChild[] {
  switch (block.kind) {
    case 'heading':
      return [writeHeading(block.text)];
    case 'paragraph':
      return [
        new Paragraph({ children: [new TextRun({ text: block.text })], spacing: { after: 120 } }),
      ];
    case 'badges':
      return [writeBadges(block.items)];
    case 'fields':
      return [writeFields(block.items)];
    case 'entries':
      return writeEntries(block.items, block.emptyText);
    case 'table':
      return [writeTable(block)];
  }
}

/* O título da seção fica junto do que vem embaixo: sozinho no pé de uma página, fica órfão. */
function writeHeading(text: string): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true })],
  });
}

function writeBadges(badges: DocumentBadge[]): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: badges.flatMap((badge, index) => [
      ...(index === 0
        ? []
        : [new TextRun({ text: BADGE_SEPARATOR, color: DOCUMENT_PALETTE.subtext })]),
      writeBadge(badge),
    ]),
  });
}

function writeBadge(badge: DocumentBadge): TextRun {
  return new TextRun({
    text: badge.text,
    bold: true,
    color: DOCUMENT_TONE_COLORS[badge.tone].fill,
  });
}

/** Os pares "rótulo: valor", na mesma tabela de fio preto do modelo. */
function writeFields(fields: DocumentField[]): Table | Paragraph {
  if (fields.length === 0) return new Paragraph({});

  return new Table({
    width: { size: FULL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
    borders: MODEL_BORDERS,
    rows: fields.map(
      (field) =>
        new TableRow({
          cantSplit: true,
          children: [
            writeCell({ text: field.label, bold: true }),
            writeCell({ text: field.value }),
          ],
        }),
    ),
  });
}

function writeEntries(entries: DocumentEntry[], emptyText: string): Paragraph[] {
  if (entries.length === 0) return [writeEmptyState(emptyText)];

  return entries.flatMap(writeEntry);
}

function writeEntry(entry: DocumentEntry): Paragraph[] {
  const paragraphs = [
    new Paragraph({
      keepNext: true,
      spacing: { before: 200 },
      children: [
        writeBadge(entry.badge),
        new TextRun({ text: `${BADGE_SEPARATOR}${entry.caption}`, bold: true }),
      ],
    }),
    new Paragraph({
      keepNext: true,
      children: [
        new TextRun({ text: entry.details, size: SMALL_SIZE, color: DOCUMENT_PALETTE.subtext }),
      ],
    }),
    new Paragraph({
      spacing: { after: entry.note ? 0 : 160 },
      children: [new TextRun({ text: entry.body })],
    }),
  ];
  if (!entry.note) return paragraphs;

  return [
    ...paragraphs,
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: entry.note,
          italics: true,
          size: SMALL_SIZE,
          color: DOCUMENT_PALETTE.subtext,
        }),
      ],
    }),
  ];
}

/**
 * A tabela do modelo: fio preto fino em tudo, cabeçalho em negrito que se repete em toda página,
 * coluna de número alinhada à direita e nenhuma linha cortada ao meio entre duas páginas.
 */
function writeTable(block: TableBlock): Table {
  const size = block.headers.length <= 5 ? TEXT_SIZE : SMALL_SIZE;
  const numeric = block.headers.map((_, index) => isNumericColumn(block.rows, index));
  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: block.headers.map((text) => writeCell({ text, bold: true, size })),
  });

  return new Table({
    width: { size: FULL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
    borders: MODEL_BORDERS,
    rows: [header, ...bodyRows(block, numeric, size)],
  });
}

/* Tabela vazia é UMA linha dizendo isso: só o cabeçalho, sem linha nenhuma, parece defeito. */
function bodyRows(block: TableBlock, numeric: boolean[], size: number): TableRow[] {
  if (block.rows.length === 0) {
    return [
      new TableRow({
        children: [
          writeCell({
            text: block.emptyText,
            italics: true,
            size,
            alignment: AlignmentType.CENTER,
            columnSpan: block.headers.length,
          }),
        ],
      }),
    ];
  }

  return block.rows.map(
    (row) =>
      new TableRow({
        cantSplit: true,
        children: block.headers.map((_, index) =>
          writeValueCell(row[index] ?? { text: '' }, numeric[index] ?? false, size),
        ),
      }),
  );
}

function writeValueCell(cell: DocumentCell, isNumeric: boolean, size: number): TableCell {
  return writeCell({
    text: cell.text,
    size,
    bold: Boolean(cell.tone),
    color: cell.tone ? DOCUMENT_TONE_SOFT_COLORS[cell.tone].text : undefined,
    alignment: isNumeric ? AlignmentType.RIGHT : AlignmentType.LEFT,
  });
}

type CellText = {
  text: string;
  bold?: boolean;
  italics?: boolean;
  size?: number;
  color?: string;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  columnSpan?: number;
};

function writeCell(content: CellText): TableCell {
  return new TableCell({
    columnSpan: content.columnSpan,
    borders: { top: MODEL_LINE, bottom: MODEL_LINE, left: MODEL_LINE, right: MODEL_LINE },
    margins: {
      left: CELL_MARGIN.side,
      right: CELL_MARGIN.side,
      top: CELL_MARGIN.vertical,
      bottom: CELL_MARGIN.vertical,
    },
    children: [
      new Paragraph({
        alignment: content.alignment,
        children: [
          new TextRun({
            text: content.text,
            bold: content.bold,
            italics: content.italics,
            size: content.size,
            color: content.color,
          }),
        ],
      }),
    ],
  });
}

function writeEmptyState(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: DOCUMENT_PALETTE.subtext })],
  });
}

function writeVerification(verification: DocumentVerification): Paragraph[] {
  return [
    writeHeading('Conferência do documento'),
    ...verification.lines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({ text: line, size: SMALL_SIZE, color: DOCUMENT_PALETTE.subtext }),
          ],
        }),
    ),
    new Paragraph({
      children: [
        new ExternalHyperlink({
          link: verification.url,
          children: [
            new TextRun({
              text: verification.displayUrl,
              size: SMALL_SIZE,
              underline: {},
              color: DOCUMENT_PALETTE.primary,
            }),
          ],
        }),
      ],
    }),
  ];
}
