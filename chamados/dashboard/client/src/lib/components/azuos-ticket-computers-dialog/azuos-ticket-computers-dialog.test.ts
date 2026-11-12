import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketComputersDialog, {
  selectionLabel,
  type TicketComputerChoice,
} from './azuos-ticket-computers-dialog.svelte';

function choice(over: Partial<TicketComputerChoice> = {}): TicketComputerChoice {
  return {
    id: 6,
    label: 'COMPUTADOR - 06',
    hostname: 'COMERCIAL-D06',
    responsibleName: 'Carol',
    department: 'Comercial',
    isOnline: true,
    ...over,
  };
}

function actions() {
  return {
    onSearch: vi.fn(),
    onDepartmentChange: vi.fn(),
    onToggle: vi.fn(),
    onClearSelection: vi.fn(),
    onApply: vi.fn(),
    onClose: vi.fn(),
  };
}

const base = { search: '', department: '', departments: [{ value: 'Comercial', label: 'Comercial' }] };

describe('selectionLabel', () => {
  // feliz
  it('counts the chosen machines', () => {
    expect(selectionLabel(1)).toBe('1 máquina selecionada');
    expect(selectionLabel(3)).toBe('3 máquinas selecionadas');
  });

  // triste
  it('says when nothing is chosen', () => {
    expect(selectionLabel(0)).toBe('Nenhuma máquina selecionada');
  });
});

describe('AzuosTicketComputersDialog', () => {
  // feliz
  it('marks many machines and applies them at once', async () => {
    const handlers = actions();
    render(TicketComputersDialog, {
      data: {
        ...base,
        computers: [choice(), choice({ id: 7, label: 'COMPUTADOR - 07', hostname: 'COMERCIAL-D07' })],
        selectedIds: [6],
      },
      actions: handlers,
    });

    expect(screen.getByRole('button', { name: /COMPUTADOR - 06/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /COMPUTADOR - 07/ }));
    expect(handlers.onToggle).toHaveBeenCalledWith(7);

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(handlers.onApply).toHaveBeenCalled();
    expect(screen.getByText('1 máquina selecionada')).toBeInTheDocument();
  });

  it('searches as the person types', async () => {
    const handlers = actions();
    render(TicketComputersDialog, {
      data: { ...base, computers: [choice()], selectedIds: [] },
      actions: handlers,
    });

    await userEvent.type(screen.getByPlaceholderText('Nome da máquina, apelido ou responsável'), 'c');

    expect(handlers.onSearch).toHaveBeenCalledWith('c');
  });

  // triste
  it('says when the search found no machine', () => {
    render(TicketComputersDialog, {
      data: { ...base, computers: [], selectedIds: [] },
      actions: actions(),
    });

    expect(screen.getByText('Nenhuma máquina encontrada')).toBeInTheDocument();
  });

  it('shows the refusal of the server', () => {
    render(TicketComputersDialog, {
      data: { ...base, computers: [choice()], selectedIds: [6] },
      state: { error: 'Alguma máquina escolhida não existe mais no inventário.' },
      actions: actions(),
    });

    expect(screen.getByText('Alguma máquina escolhida não existe mais no inventário.')).toBeInTheDocument();
  });
});
