/**
 * O TETO de linhas de um relatório.
 *
 * O arquivo é montado inteiro na memória, nos três formatos. Sem teto, um filtro largo num
 * banco grande monta dezenas de milhares de linhas de uma vez — e uma única pessoa exportando
 * derruba o servidor para todas. Cinco mil cobrem com folga o uso de verdade; quem precisa de
 * mais refina o filtro e exporta em partes.
 */
export const REPORT_MAX_ROWS = 5000;

/**
 * Quantas linhas o repositório busca: UMA a mais que o teto. É essa linha de sobra que diz se
 * o relatório foi cortado, sem uma segunda consulta só para contar.
 */
export const REPORT_FETCH_LIMIT = REPORT_MAX_ROWS + 1;

/** Corta as linhas no teto e diz se sobrou alguma de fora. */
export function capReportRows<TRow>(rows: TRow[]): { rows: TRow[]; isTruncated: boolean } {
  if (rows.length <= REPORT_MAX_ROWS) return { rows, isTruncated: false };

  return { rows: rows.slice(0, REPORT_MAX_ROWS), isTruncated: true };
}
