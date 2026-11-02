import { describe, expect, it, vi } from 'vitest';

vi.mock('./http-client', () => ({ apiRequest: vi.fn(), uploadFile: vi.fn() }));

const { apiRequest, uploadFile } = await import('./http-client');
const { maintenanceQuotesApi } = await import('./maintenance-quotes.api');

const values = {
  supplier: 'Clima Norte',
  description: 'Limpeza do split',
  kind: 'service' as const,
  amount: '1.250,00',
  quotedOn: '2026-10-02',
  status: 'pending' as const,
  note: '',
};

describe('maintenanceQuotesApi', () => {
  // feliz
  it('sends the amount in cents and the document that was uploaded first', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ key: 'docs/orcamento.pdf' } as never);
    vi.mocked(apiRequest).mockResolvedValue({ id: 1 });
    const file = new File(['x'], 'orcamento.pdf', { type: 'application/pdf' });

    await maintenanceQuotesApi.create(values, file);

    expect(uploadFile).toHaveBeenCalledWith('/maintenance-quotes/attachment/upload-url', file);
    expect(apiRequest).toHaveBeenCalledWith('/maintenance-quotes', {
      method: 'POST',
      body: expect.objectContaining({ amountCents: 125000, attachment: { key: 'docs/orcamento.pdf' }, removeAttachment: undefined }),
    });
  });

  // feliz
  it('updates without touching the document, or asking to drop it', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: 1 });
    vi.mocked(uploadFile).mockClear();

    await maintenanceQuotesApi.update(7, values, null);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenance-quotes/7', {
      method: 'PATCH',
      body: expect.objectContaining({ attachment: undefined, removeAttachment: undefined }),
    });

    await maintenanceQuotesApi.update(7, values, null, true);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenance-quotes/7', {
      method: 'PATCH',
      body: expect.objectContaining({ removeAttachment: true }),
    });
  });

  // feliz
  it('lists with the filters and removes by id', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined);
    await maintenanceQuotesApi.list({ page: 2, search: 'clima' });
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenance-quotes', { query: expect.objectContaining({ page: 2, search: 'clima' }) });
    await maintenanceQuotesApi.remove(3);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenance-quotes/3', { method: 'DELETE' });
  });

  // triste
  it('sends zero cents when the amount cannot be read', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ id: 1 });
    await maintenanceQuotesApi.create({ ...values, amount: 'abc' }, null);
    expect(apiRequest).toHaveBeenLastCalledWith('/maintenance-quotes', {
      method: 'POST',
      body: expect.objectContaining({ amountCents: 0 }),
    });
  });
});
