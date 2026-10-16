import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type DocumentDefinition } from './document.type';

/**
 * A MARCA nos documentos: o nome, as logos, a fonte e a linha "Gerado em". É o mesmo padrão da
 * Gestão de RH (`gestao-rh/server/src/modules/report-files`) — o papel timbrado da casa —, para
 * um PDF, um Word e um Excel do chamados saírem com a mesma cara dos outros sistemas.
 */
export const BRAND_NAME = 'Grupo Azuos · Chamados';

/** A pasta dos arquivos da marca — a ÚNICA de onde o gerador de PDF pode ler. */
export const DOCUMENT_ASSETS = join(__dirname, 'assets');

/**
 * A logo oficial em três versões, tiradas do vetor do repositório de marca: a azul vai sobre o
 * papel branco (o vetor no PDF, o PNG no Word, que não desenha vetor em todo programa); a
 * branca, sobre a faixa azul do Excel. O desenho é o mesmo — só a cor muda.
 */
export const LOGO_BLUE_SVG = readFileSync(join(DOCUMENT_ASSETS, 'azuos-logo-blue.svg'), 'utf8');
export const LOGO_BLUE_PNG = readFileSync(join(DOCUMENT_ASSETS, 'azuos-logo-blue.png'));
export const LOGO_WHITE_PNG = readFileSync(join(DOCUMENT_ASSETS, 'azuos-logo-white.png'));

/** Largura ÷ altura da logo: o que mantém a proporção ao escolher um tamanho. */
export const LOGO_RATIO = 1727 / 491;

/** A altura da logo para uma largura — a logo nunca sai esticada. */
export function logoHeightFor(width: number): number {
  return Math.round((width / LOGO_RATIO) * 100) / 100;
}

/**
 * A fonte do papel timbrado é a Arial Narrow. O Word e o Excel só guardam o NOME da fonte, e
 * quem abre o arquivo a tem instalada. O PDF precisa do arquivo DENTRO dele, e a Arial Narrow
 * não tem licença para isso: entra a Liberation Sans Narrow, que ocupa exatamente o mesmo espaço
 * letra a letra (`fonts/LICENSE.txt`).
 */
export const OFFICE_FONT = 'Arial Narrow';
export const PDF_FONT = 'LiberationSansNarrow';

const GENERATED_AT = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

/** "Gerado em 17/09/2026, 14:30" — o horário de Brasília, onde quer que o servidor esteja. */
export function generatedAtLabel(now: Date): string {
  return `Gerado em ${GENERATED_AT.format(now)}`;
}

const NUMERIC = /^-?[\d.]+(,\d+)?%?$/;

/**
 * Coluna só de número (e de traço, onde não há valor) alinha à direita, como no modelo: é o que
 * deixa as casas uma embaixo da outra. Coluna vazia não conta como numérica.
 */
export function isNumericColumn(
  rows: readonly (readonly { text: string }[])[],
  index: number,
): boolean {
  const values = rows.map((row) => row[index]?.text ?? '').filter((value) => value !== '—');
  if (values.length === 0) return false;

  return values.every((value) => NUMERIC.test(value));
}

/**
 * A partir de quantas colunas a folha DEITA. Com as margens de 3 cm do modelo, uma tabela de sete
 * colunas em pé deixa menos de 2 cm para cada uma — nome e telefone quebram em três linhas.
 */
const LANDSCAPE_FROM_COLUMNS = 7;

/** Deitada só quando pedida E quando há tabela larga: o resto cabe em pé, como no modelo. */
export function pageOrientationOf(definition: DocumentDefinition): 'portrait' | 'landscape' {
  const widest = Math.max(
    0,
    ...definition.blocks.map((block) => (block.kind === 'table' ? block.headers.length : 0)),
  );
  const isWide = widest >= LANDSCAPE_FROM_COLUMNS;

  return definition.orientation === 'landscape' && isWide ? 'landscape' : 'portrait';
}
