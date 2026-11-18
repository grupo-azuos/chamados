import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-transfer-form-harness.test.svelte';
import { type TransferFormModel } from './use-transfer-form.svelte';

vi.mock('$lib/api/transfers.api', () => ({
  transfersApi: { list: vi.fn(), installedParts: vi.fn(), create: vi.fn() },
}));

vi.mock('$lib/api/computers.api', () => ({ computersApi: { list: vi.fn() } }));

const { transfersApi } = await import('$lib/api/transfers.api');
const { computersApi } = await import('$lib/api/computers.api');

const computer = {
  id: 2,
  name: 'FINANCEIRO-02',
  displayName: 'Financeiro — mesa 2',
  department: 'financeiro',
} as ComputerListItem;

const other = { id: 3, name: 'CONTABIL-03', displayName: null } as ComputerListItem;

function mountModel(onSaved = vi.fn()): TransferFormModel {
  let model!: TransferFormModel;
  render(Harness, {
    props: { computer, onSaved, onReady: (ready: TransferFormModel) => (model = ready) },
  });

  return model;
}

async function mountLoadedModel(onSaved = vi.fn()): Promise<TransferFormModel> {
  const model = mountModel(onSaved);
  await waitFor(() => expect(model.state.isLoadingPeripherals).toBe(false));

  return model;
}

describe('useTransferFormModel', () => {
  beforeEach(() => {
    vi.mocked(transfersApi.installedParts).mockResolvedValue([
      { partId: 7, name: 'Teclado USB ABNT2', category: 'keyboard', quantity: 1 },
    ]);
    vi.mocked(transfersApi.create).mockResolvedValue({
      id: 1,
      computerId: 2,
      fromDepartment: 'financeiro',
      toDepartment: 'fiscal',
      responsible: null,
      note: null,
      peripheralsLeftBehind: 0,
      createdAt: '2026-09-25T12:00:00.000Z',
      createdBy: 'ana@empresa.com.br',
    });
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [computer, other],
      total: 2,
      page: 1,
      pageSize: 100,
    });
  });

  // feliz
  /* Abre onde a máquina está: quem só quer registrar o responsável não muda o setor sem querer. */
  it('opens on the department the machine is in', async () => {
    const model = await mountLoadedModel();

    expect(model.data.toDepartment).toBe('financeiro');
  });

  it('lists what is on the machine, everything going along by default', async () => {
    const model = await mountLoadedModel();

    expect(model.data.peripherals).toHaveLength(1);
    expect(model.data.peripherals[0]?.destiny).toBe('machine');
  });

  /* Oferecer a própria máquina seria oferecer "a peça fica na máquina que foi embora". */
  it('leaves the machine that is leaving out of the destination list', async () => {
    const model = await mountLoadedModel();

    await waitFor(() => expect(model.data.machines.length).toBeGreaterThan(0));
    expect(model.data.machines.map((machine) => machine.value)).toEqual(['3']);
  });

  it('sends only what stays behind to the server', async () => {
    const model = await mountLoadedModel();

    model.actions.onDepartmentChange('fiscal');
    model.actions.onDestinyChange(7, 'station');
    model.actions.onDestinationChange(7, '3');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(transfersApi.create).toHaveBeenCalledWith(2, {
        toDepartment: 'fiscal',
        responsible: undefined,
        note: undefined,
        peripherals: [
          { partId: 7, quantity: 1, destiny: 'station', destinationComputerId: 3 },
        ],
      }),
    );
  });

  it('sends nothing about peripherals when everything goes along', async () => {
    const model = await mountLoadedModel();

    model.actions.onDepartmentChange('fiscal');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(transfersApi.create).toHaveBeenCalledWith(2, expect.objectContaining({ peripherals: [] })),
    );
  });

  /* Vazio é a prateleira, e é um destino de verdade. */
  it('sends no department when the machine goes back to the shelf', async () => {
    const model = await mountLoadedModel();

    model.actions.onDepartmentChange('');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(transfersApi.create).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ toDepartment: null }),
      ),
    );
  });

  it('closes the dialog after saving', async () => {
    const onSaved = vi.fn();
    const model = await mountLoadedModel(onSaved);

    model.actions.onDepartmentChange('fiscal');
    model.actions.onSubmit();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  // triste
  /* Peça que fica sem destino trava o botão: gravar assim tiraria a peça de uma máquina sem
     colocá-la em nenhuma outra. */
  it('holds the transfer while a destination is missing', async () => {
    const model = await mountLoadedModel();

    model.actions.onDestinyChange(7, 'station');

    await waitFor(() => expect(model.state.isIncomplete).toBe(true));

    model.actions.onDestinationChange(7, '3');

    await waitFor(() => expect(model.state.isIncomplete).toBe(false));
  });

  it('hands the screen the reason the server refused', async () => {
    vi.mocked(transfersApi.create).mockRejectedValue(
      new ApiError(422, 'A máquina já está nesse departamento.'),
    );

    const model = await mountLoadedModel();
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('A máquina já está nesse departamento.'),
    );
  });
});

describe('useTransferFormModel — the free texts and a machine on the shelf', () => {
  beforeEach(() => {
    vi.mocked(transfersApi.installedParts).mockResolvedValue([]);
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [computer, { ...other, hardware: { hostname: 'contabil-03.local' } } as ComputerListItem],
      total: 2,
      page: 1,
      pageSize: 100,
    });
  });

  // feliz
  it('keeps who received the machine and the note, and names machines by their hostname', async () => {
    const model = await mountLoadedModel();

    model.actions.onResponsibleChange('Coordenação');
    model.actions.onNoteChange('Mesa nova.');

    await waitFor(() => expect(model.data.responsible).toBe('Coordenação'));
    expect(model.data.note).toBe('Mesa nova.');
    await waitFor(() => expect(model.data.machines.some((option) => option.label.includes('contabil-03.local'))).toBe(true));
  });

  // feliz
  it('opens on the shelf when the machine has no department', async () => {
    let model!: TransferFormModel;
    render(Harness, {
      props: {
        computer: { ...computer, department: null } as ComputerListItem,
        onSaved: vi.fn(),
        onReady: (ready: TransferFormModel) => (model = ready),
      },
    });

    await waitFor(() => expect(model.state.isLoadingPeripherals).toBe(false));
    expect(model.data.toDepartment).toBe('');
  });
});

describe('useTransferFormModel — before the peripherals arrive, and the machine names', () => {
  beforeEach(() => {
    vi.mocked(transfersApi.create).mockReset().mockResolvedValue({
      id: 1,
      computerId: 2,
      fromDepartment: 'financeiro',
      toDepartment: 'fiscal',
      responsible: null,
      note: null,
      peripheralsLeftBehind: 0,
      createdAt: '2026-09-25T12:00:00.000Z',
      createdBy: 'ana@empresa.com.br',
    });
  });

  // feliz
  it('names each destination machine by nickname and host, or by what it has', async () => {
    vi.mocked(transfersApi.installedParts).mockResolvedValue([]);
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [
        computer,
        other,
        { id: 4, name: 'FISCAL-04', displayName: 'Fiscal — mesa 4', hardware: { hostname: ' ' } } as ComputerListItem,
        { id: 5, name: 'RH-05', displayName: null, hardware: { hostname: 'RH-HOST' } } as ComputerListItem,
      ],
      total: 4,
      page: 1,
      pageSize: 100,
    });
    const model = await mountLoadedModel();

    await waitFor(() => expect(model.data.machines).toHaveLength(3));
    expect(model.data.machines.map((machine) => machine.label)).toEqual([
      'CONTABIL-03',
      'Fiscal — mesa 4 (FISCAL-04)',
      'RH-HOST',
    ]);
  });

  it('keeps a peripheral on the machine until told otherwise, even when the destination comes first', async () => {
    vi.mocked(transfersApi.installedParts).mockResolvedValue([
      { partId: 7, name: 'Teclado USB ABNT2', category: 'keyboard', quantity: 1 },
    ]);
    vi.mocked(computersApi.list).mockResolvedValue({ items: [computer, other], total: 2, page: 1, pageSize: 100 });
    const model = await mountLoadedModel();

    model.actions.onDestinationChange(7, '3');

    expect(model.data.peripherals[0]?.destiny).toBe('machine');
  });

  // triste
  it('sends no peripherals when the list has not arrived yet', async () => {
    vi.mocked(transfersApi.installedParts).mockReturnValue(new Promise(() => undefined));
    vi.mocked(computersApi.list).mockResolvedValue({ items: [computer, other], total: 2, page: 1, pageSize: 100 });
    const model = mountModel();

    model.actions.onDepartmentChange('fiscal');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(transfersApi.create).toHaveBeenCalledWith(2, expect.objectContaining({ peripherals: [] })),
    );
  });
});
