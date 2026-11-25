import { describe, expect, it } from 'vitest';

import {
  isReportFormat,
  reportFormatLabel,
  reportFormatOptions,
  reportFormatSchema,
} from './report.schema';

describe('reportFormatSchema', () => {
  // feliz
  it('accepts the three known formats', () => {
    expect(reportFormatSchema.parse('xlsx')).toBe('xlsx');
    expect(reportFormatSchema.parse('docx')).toBe('docx');
    expect(reportFormatSchema.parse('pdf')).toBe('pdf');
  });

  // triste
  it('rejects a format outside the list with a Portuguese sentence', () => {
    const result = reportFormatSchema.safeParse('csv');

    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe(
      'Escolha um formato de arquivo',
    );
  });
});

describe('reportFormatOptions', () => {
  // feliz
  it('lists the three formats with the Portuguese label', () => {
    expect(reportFormatOptions()).toEqual([
      { value: 'xlsx', label: 'Excel' },
      { value: 'docx', label: 'Word' },
      { value: 'pdf', label: 'PDF' },
    ]);
  });
});

describe('reportFormatLabel', () => {
  // feliz
  it('translates each format into the name the person recognises', () => {
    expect(reportFormatLabel('xlsx')).toBe('Excel');
    expect(reportFormatLabel('docx')).toBe('Word');
    expect(reportFormatLabel('pdf')).toBe('PDF');
  });
});

describe('isReportFormat', () => {
  // feliz
  it('recognizes the three formats', () => {
    expect(isReportFormat('pdf')).toBe(true);
  });

  // triste
  it('refuses anything else', () => {
    expect(isReportFormat('csv')).toBe(false);
    expect(isReportFormat(1)).toBe(false);
  });
});
