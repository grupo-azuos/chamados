import { describe, expect, it } from 'vitest';

import { capReportRows, REPORT_FETCH_LIMIT, REPORT_MAX_ROWS } from './report-limit.util';

describe('capReportRows', () => {
  // feliz
  it('keeps every row when the report fits under the ceiling', () => {
    const rows = Array.from({ length: REPORT_MAX_ROWS }, (_, index) => index);

    expect(capReportRows(rows)).toEqual({ rows, isTruncated: false });
  });

  // triste
  /* O repositório busca uma linha a mais que o teto: é ela que denuncia o corte. */
  it('cuts at the ceiling and says so when one row too many came back', () => {
    const rows = Array.from({ length: REPORT_FETCH_LIMIT }, (_, index) => index);

    const capped = capReportRows(rows);

    expect(capped.isTruncated).toBe(true);
    expect(capped.rows).toHaveLength(REPORT_MAX_ROWS);
    expect(capped.rows.at(-1)).toBe(REPORT_MAX_ROWS - 1);
  });

  it('handles a report with no rows (edge case)', () => {
    expect(capReportRows([])).toEqual({ rows: [], isTruncated: false });
  });
});
