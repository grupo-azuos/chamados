import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({
  apiRequest: vi.fn().mockResolvedValue(undefined),
  apiDownload: vi.fn().mockResolvedValue(undefined),
}));

const { apiDownload, apiRequest } = await import('./http-client');
const { computersApi } = await import('./computers.api');

describe('computersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  // feliz
  /* O filtro é feito no SQL: tudo o que a tela escolheu precisa chegar ao servidor. A
     preventiva ficava de fora, e a lista vinha sem filtrar. */
  it('sends every filter of the list to the server, the preventive one included', async () => {
    await computersApi.list({ page: 1, pageSize: 200, preventive: 'due', kind: 'notebook' });

    expect(apiRequest).toHaveBeenCalledWith('/computers', {
      query: { page: 1, pageSize: 200, preventive: 'due', kind: 'notebook' },
    });
  });

  // triste
  it('sends the same filters to the report, without the page', async () => {
    await computersApi.exportReport({ page: 3, pageSize: 50, preventive: 'never' }, 'xlsx');

    expect(apiDownload).toHaveBeenCalledWith('/computers/export', {
      query: { preventive: 'never', format: 'xlsx' },
    });
  });
});
