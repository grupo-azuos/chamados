import {
  type Maintenance,
  type PreventiveDue,
} from '@template/shared/schemas/maintenance.schema';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceListView, {
  machineLabelOf,
  type MaintenanceListFilter,
} from './azuos-maintenance-list-view.svelte';
import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

function maintenance(over: Partial<Maintenance> = {}): Maintenance {
  return {
    id: 1,
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: 'Contábil — mesa do fechamento',
    computerDepartment: 'contabil',
    otherMachine: null,
    type: 'corrective',
    description: 'Cooler do processador substituído.',
    performedBy: 'Suporte TI',
    performedAt: '2026-09-20T12:00:00.000Z',
    createdAt: '2026-09-20T13:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const preventive: PreventiveDue[] = [
  {
    computerId: 2,
    computerName: 'FINANCEIRO-02',
    computerDisplayName: 'Financeiro — mesa 2',
    computerDepartment: 'financeiro',
    lastDoneAt: '2026-04-20T12:00:00.000Z',
    status: 'due',
    maintenanceCount: 3,
  },
];

const emptyFilter: MaintenanceListFilter = { search: '', type: '', computerId: null };

const actions = {
  onSearchChange: vi.fn(),
  onTypeChange: vi.fn(),
  onPageChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onAskRemove: vi.fn(),
  onCancelRemove: vi.fn(),
  onConfirmRemove: vi.fn(),
};

/* O tipo é escrito à mão: inferido de `null`, `error` viraria "só aceita nulo" e o teste do
   caminho triste não compilaria. */
const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  isTruncated: boolean;
  error: string | null;
} = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

function renderView(over: {
  maintenances?: Maintenance[];
  removing?: Maintenance | null;
  state?: Partial<typeof settled> & { actionError?: string | null; isRemoving?: boolean };
} = {}) {
  return render(MaintenanceListView, {
    props: {
      data: {
        maintenances: over.maintenances ?? [maintenance()],
        total: over.maintenances?.length ?? 1,
        preventive,
        filter: emptyFilter,
        removing: over.removing ?? null,
      },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}


/* Em "só cards" a tabela some de vez, em qualquer largura: nem a classe `xl:block` fica. */
function hasCardsOnlyTable(): boolean {
  return Array.from(document.querySelectorAll('.overflow-x-auto')).some(
    (element) => element.classList.contains('hidden') && !element.classList.contains('xl:block'),
  );
}

describe('machineLabelOf', () => {
  // feliz
  it('reads an inventoried machine by the nickname people use', () => {
    expect(machineLabelOf(maintenance())).toBe('Contábil — mesa do fechamento');
  });

  it('reads equipment outside the inventory by what was typed', () => {
    const record = maintenance({
      computerId: null,
      computerName: null,
      computerDisplayName: null,
      otherMachine: 'Impressora da recepção',
    });

    expect(machineLabelOf(record)).toBe('Impressora da recepção');
  });

  // triste
  it('falls back to the technical name when the machine has no nickname', () => {
    expect(machineLabelOf(maintenance({ computerDisplayName: null }))).toBe('CONTABIL-03');
  });
});

describe('AzuosMaintenanceListView', () => {
  // feliz
  it('lists what was done, on which machine and by whom', () => {
    renderView();

    expect(screen.getAllByText('Cooler do processador substituído.')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Contábil — mesa do fechamento')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Corretiva')[0]).toBeInTheDocument();
  });

  /* O lembrete abre o formulário JÁ com a máquina: quem clica ali está olhando para ela. */
  it('opens the form pointing at the machine when the reminder asks for it', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(actions.onRegister).toHaveBeenCalledWith(2);
  });

  it('asks before deleting, naming the record', async () => {
    const user = userEvent.setup();
    renderView({ removing: maintenance() });

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText(/Contábil — mesa do fechamento/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Excluir manutenção' }));

    expect(actions.onConfirmRemove).toHaveBeenCalled();
  });

  // triste
  it('shows the reason the history did not load', () => {
    renderView({ state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'Não consegui falar com o servidor.',
    );
  });

  /* Registro lançado correndo, sem descrição e sem responsável: a tela mostra traço, e não
     um buraco que faz a linha parecer quebrada. */
  it('shows a dash for what was left blank', () => {
    renderView({
      maintenances: [maintenance({ description: null, performedBy: null })],
    });

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('separates an empty history from a filter that hid everything', () => {
    renderView({ maintenances: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhuma manutenção registrada')).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ maintenances: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  /* Falha de exclusão fica na tela, com o motivo (CONTRIBUTING §15). */
  it('keeps the failure of a delete on screen', () => {
    renderView({ state: { actionError: 'Este registro é de outra pessoa.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Este registro é de outra pessoa.');
  });

  // feliz
  it('renders pagination bar and notifies page changes', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(MaintenanceListView, {
      props: {
        data: {
          maintenances: [maintenance()],
          total: 30,
          preventive,
          filter: emptyFilter,
          removing: null,
          paging: { page: 1, pageSize: 15, total: 30 },
        },
        state: settled,
        actions: { ...actions, onPageChange },
      },
    });

    const nextButton = screen.getByRole('button', { name: /Próxima/i });
    expect(nextButton).toBeInTheDocument();
    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('AzuosMaintenanceListView — filters, rows and the cut list', () => {
  const schedule = {
    computerId: 5,
    computerName: 'RH-05',
    computerDisplayName: 'RH — recepção',
    computerDepartment: 'rh' as const,
    scheduledFor: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
    note: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
  };

  // feliz
  it('registers from the header and from the scheduled machine', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.onRegister).mockClear();
    render(MaintenanceListView, {
      props: {
        data: { maintenances: [maintenance()], total: 1, preventive, schedules: [schedule], filter: emptyFilter, removing: null },
        state: settled,
        actions,
      },
    });

    await user.click(screen.getAllByRole('button', { name: 'Registrar manutenção' })[0]!);
    expect(actions.onRegister).toHaveBeenCalledWith();
    await user.click(screen.getAllByRole('button', { name: 'Registrar' })[0]!);
    expect(actions.onRegister).toHaveBeenLastCalledWith(expect.any(Number));
  });

  // feliz
  it('searches, filters by type and clears the filters', async () => {
    const user = userEvent.setup();
    render(MaintenanceListView, {
      props: {
        data: { maintenances: [maintenance()], total: 1, preventive, filter: { ...emptyFilter, search: 'cooler' }, removing: null },
        state: settled,
        actions,
      },
    });

    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), '!');
    expect(actions.onSearchChange).toHaveBeenCalledWith('cooler!');
    await user.click(screen.getByRole('button', { name: 'Filtrar por tipo' }));
    const search = await screen.findByPlaceholderText('Buscar…');
    const popup = search.closest('[data-slot="popover-content"]') as HTMLElement;
    await fireEvent.click(within(popup).getByText('Limpeza'));
    expect(actions.onTypeChange).toHaveBeenCalledWith('cleaning');
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalled();
  });

  // feliz
  it('describes equipment outside the inventory and a machine without department', () => {
    renderView({
      maintenances: [
        maintenance({ id: 1, computerId: null, computerName: null, computerDisplayName: null, computerDepartment: null, otherMachine: 'Impressora da recepção', performedBy: null, description: null }),
        maintenance({ id: 2, computerDepartment: null, computerDisplayName: '  ' }),
      ],
      state: { isTruncated: true },
    });
    expect(screen.getAllByText('Impressora da recepção').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fora do inventário').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CONTABIL-03').length).toBeGreaterThan(0);
    expect(screen.getByText(/Mostrando 2 de 2 manutenções/)).toBeInTheDocument();
  });

  // feliz
  it('corrects and asks to delete from the cards and from the table', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.onEdit).mockClear();
    vi.mocked(actions.onAskRemove).mockClear();
    renderView();

    const edits = screen.getAllByRole('button', { name: 'Corrigir' });
    const removes = screen.getAllByRole('button', { name: 'Excluir' });
    for (const button of [...edits]) await user.click(button);
    for (const button of [...removes]) await user.click(button);
    expect(actions.onEdit).toHaveBeenCalledTimes(edits.length);
    expect(actions.onAskRemove).toHaveBeenCalledTimes(removes.length);
  });

  // triste
  it('cancels the deletion and keeps the empty state button working', async () => {
    /* A pergunta fechada ainda trava o ponteiro na página até acabar a animação. */
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    vi.mocked(actions.onRegister).mockClear();
    renderView({ removing: maintenance(), state: { actionError: 'Sem permissão.' } });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sem permissão.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(actions.onCancelRemove).toHaveBeenCalled();

    cleanup();
    renderView({ maintenances: [], state: { isEmpty: true } });
    await user.click(screen.getAllByRole('button', { name: 'Registrar manutenção' }).at(-1)!);
    expect(actions.onRegister).toHaveBeenCalledWith();
  });

  // triste
  it('shows the history as loading', () => {
    renderView({ state: { isLoading: true, isPreventiveLoading: true } as never });
    expect(screen.queryByText('Cooler do processador substituído.')).not.toBeInTheDocument();
  });
});

describe('maintenance-list-view — cards only', () => {
  // feliz
  it('hides the table completely when the person asked for cards only', () => {
    const tableView = useTableViewModel();
    tableView.actions.onToggle();
    try {
      renderView();

      expect(hasCardsOnlyTable()).toBe(true);
    } finally {
      tableView.actions.onToggle();
    }
  });
});
