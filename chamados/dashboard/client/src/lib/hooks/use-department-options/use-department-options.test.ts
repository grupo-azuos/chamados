import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/departments.api', () => ({ departmentsApi: { catalog: vi.fn() } }));

import { departmentsApi } from '$lib/api/departments.api';
import Harness from './use-department-options-harness.test.svelte';
import { type DepartmentOptionsModel } from './use-department-options.svelte';

function mount(): DepartmentOptionsModel {
  let model!: DepartmentOptionsModel;
  render(Harness, { onReady: (ready: DepartmentOptionsModel) => (model = ready) });

  return model;
}

describe('useDepartmentOptionsModel', () => {
  beforeEach(() => vi.clearAllMocks());

  // feliz
  it('offers the HR departments first and the local ones after a divider', async () => {
    vi.mocked(departmentsApi.catalog).mockResolvedValue({
      rh: ['Contábil', 'Fiscal'],
      local: ['ANALYZE'],
      isRhAvailable: true,
    });
    const model = mount();

    await waitFor(() => expect(model.isLoading).toBe(false));

    expect(model.options).toEqual([
      { value: 'Contábil', label: 'Contábil' },
      { value: 'Fiscal', label: 'Fiscal' },
      { value: 'ANALYZE', label: 'ANALYZE', separatorBefore: true },
    ]);
    expect(model.isRhAvailable).toBe(true);
  });

  // triste
  it('says HR is unavailable and keeps the local departments to choose from', async () => {
    vi.mocked(departmentsApi.catalog).mockResolvedValue({
      rh: [],
      local: ['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'],
      isRhAvailable: false,
    });
    const model = mount();

    await waitFor(() => expect(model.isRhAvailable).toBe(false));

    expect(model.options.map((option) => option.value)).toEqual(['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO']);
  });

  it('offers the local departments while the list is still loading', () => {
    vi.mocked(departmentsApi.catalog).mockReturnValue(new Promise(() => {}));
    const model = mount();

    expect(model.isLoading).toBe(true);
    expect(model.isRhAvailable).toBe(true);
    expect(model.options.map((option) => option.value)).toEqual(['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO']);
  });
});
