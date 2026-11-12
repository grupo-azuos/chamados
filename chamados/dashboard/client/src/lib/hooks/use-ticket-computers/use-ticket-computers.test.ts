import { render, waitFor } from '@testing-library/svelte';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-computers-harness.test.svelte';
import {
  filterChoices,
  linkedOf,
  toggle,
  type TicketComputersModel,
} from './use-ticket-computers.svelte';

vi.mock('$lib/api/tickets.api', () => ({ ticketsApi: { updateComputers: vi.fn() } }));
vi.mock('$lib/api/computers.api', () => ({ computersApi: { list: vi.fn() } }));
vi.mock('$lib/api/departments.api', () => ({
  departmentsApi: { catalog: vi.fn().mockResolvedValue({ rh: [], local: [], isRhAvailable: true }) },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');
const { computersApi } = await import('$lib/api/computers.api');

const ticket = {
  id: 50,
  computerId: 6,
  computerName: 'COMPUTADOR - 06',
  computers: [{ id: 6, name: 'COMPUTADOR - 06' }],
} as unknown as Ticket;

function mountModel(): TicketComputersModel {
  let model: TicketComputersModel | undefined;
  render(Harness, { props: { ticket, onReady: (ready: TicketComputersModel) => (model = ready) } });
  if (!model) throw new Error('model not ready');

  return model;
}

describe('useTicketComputersModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 200 });
    vi.mocked(ticketsApi.updateComputers).mockReset();
  });

  // feliz
  it('starts from the machines of the ticket and applies the new list at once', async () => {
    vi.mocked(ticketsApi.updateComputers).mockResolvedValue({
      ...ticket,
      computers: [
        { id: 6, name: 'COMPUTADOR - 06' },
        { id: 7, name: 'COMPUTADOR - 07' },
      ],
    });
    const model = mountModel();

    model.actions.onOpen();
    expect(model.data.selectedIds).toEqual([6]);
    model.actions.onToggle(7);
    model.actions.onApply();

    await waitFor(() => expect(model.data.linked).toHaveLength(2));
    expect(ticketsApi.updateComputers).toHaveBeenCalledWith(50, [6, 7]);
    expect(model.state.isOpen).toBe(false);
  });

  // triste
  it('keeps the dialog open with the reason when the server refuses', async () => {
    vi.mocked(ticketsApi.updateComputers).mockRejectedValue(
      new ApiError(422, 'Alguma máquina escolhida não existe mais no inventário.'),
    );
    const model = mountModel();

    model.actions.onOpen();
    model.actions.onApply();

    await waitFor(() => expect(model.state.error).toMatch(/não existe mais/));
    expect(model.state.isOpen).toBe(true);
  });

  it('drops the draft when closed without applying', () => {
    const model = mountModel();

    model.actions.onOpen();
    model.actions.onToggle(9);
    model.actions.onClose();
    model.actions.onOpen();

    expect(model.data.selectedIds).toEqual([6]);
  });
});

const six = {
  id: 6,
  label: 'COMPUTADOR - 06',
  hostname: 'COMERCIAL-D06',
  responsibleName: 'Carol',
  department: 'Comercial',
  isOnline: true,
};
const eleven = {
  id: 11,
  label: 'COMPUTADOR - 11',
  hostname: 'FISCAL-D11',
  responsibleName: null,
  department: 'Fiscal',
  isOnline: false,
};

describe('filterChoices', () => {
  // feliz
  it('finds by name, machine name or the person, ignoring case', () => {
    expect(filterChoices([six, eleven], 'carol', '')).toEqual([six]);
    expect(filterChoices([six, eleven], 'fiscal-d', '')).toEqual([eleven]);
  });

  it('narrows to the chosen department', () => {
    expect(filterChoices([six, eleven], '', 'Fiscal')).toEqual([eleven]);
  });

  /* O filtro compara pelo valor da lista do RH, e não pelo nome que a tela mostra. */
  it('compares the department by its key when there is one', () => {
    const keyed = { ...eleven, department: 'Fiscal e Tributário', departmentKey: 'fiscal' };

    expect(filterChoices([six, keyed], '', 'fiscal')).toEqual([keyed]);
  });

  // triste
  it('finds nothing for a name that does not exist', () => {
    expect(filterChoices([six, eleven], 'impressora', '')).toEqual([]);
  });
});

describe('toggle', () => {
  // feliz
  it('adds a machine at the end, keeping the order of choice', () => {
    expect(toggle([6], 11)).toEqual([6, 11]);
  });

  // triste
  it('takes a machine out when it was already chosen', () => {
    expect(toggle([6, 11], 6)).toEqual([11]);
  });
});

describe('linkedOf', () => {
  // triste
  it('reads an old ticket, without the list, by its single machine', () => {
    expect(
      linkedOf({ computerId: 6, computerName: 'COMPUTADOR - 06' } as never),
    ).toEqual([{ id: 6, name: 'COMPUTADOR - 06' }]);
    expect(linkedOf({ computerId: null, computerName: null } as never)).toEqual([]);
  });
});
