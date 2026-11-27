import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Dialog, { linkSummary } from './azuos-ticket-stock-link-dialog.svelte';

function setup(selection: Record<string, string> = {}) {
  const actions = {
    onMachineChange: vi.fn(),
    onDirectionChange: vi.fn(),
    onSearch: vi.fn(),
    onToggle: vi.fn(),
    onQuantityChange: vi.fn(),
    onApply: vi.fn(),
    onClose: vi.fn(),
  };
  render(Dialog, {
    props: {
      data: {
        machines: [{ value: '6', label: 'Computador 06' }],
        machineId: '6',
        direction: 'out',
        options: [
          { id: 1, name: 'Monitor 24"', available: 2 },
          { id: 2, name: 'Teclado', available: 5 },
        ],
        search: '',
        selection,
        errors: { '1': 'Só 2 disponível' },
      },
      state: { isOpen: true },
      actions,
    },
  });
  return actions;
}

describe('AzuosTicketStockLinkDialog', () => {
  // feliz
  it('picks the machine on one side, marks items with quantity on the other, and links', async () => {
    const actions = setup({ '1': '3' });

    expect(screen.getByRole('status')).toHaveTextContent('Computador 06 → 1 item');
    await userEvent.click(screen.getByRole('button', { name: '(Sem máquina)' }));
    expect(actions.onMachineChange).toHaveBeenCalledWith('');
    await userEvent.click(screen.getByRole('checkbox', { name: /Teclado/ }));
    expect(actions.onToggle).toHaveBeenCalledWith('2');
    expect(screen.getByText('Só 2 disponível')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Vincular 1' }));
    expect(actions.onApply).toHaveBeenCalled();
  });

  // triste
  it('does not link with nothing marked', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Vincular' })).toBeDisabled();
    expect(linkSummary(null, 3)).toBe('Sem máquina → 3 itens');
  });
});

describe('AzuosTicketStockLinkDialog — descarte e cadastro', () => {
  // feliz
  it('asks the reason on the disposal, and opens the new item form', async () => {
    const onReasonChange = vi.fn();
    const onOpenNew = vi.fn();
    render(Dialog, {
      props: {
        data: {
          machines: [],
          machineId: '',
          direction: 'disposal',
          options: [],
          search: '',
          selection: {},
          reason: '',
          reasonError: 'Escolha o motivo do descarte',
          newItem: {
            source: 'parts',
            isOpen: false,
            values: { name: '', quantity: '1', category: '', condition: 'new', unit: 'unit' },
          },
        },
        state: { isOpen: true },
        actions: {
          onMachineChange: vi.fn(),
          onDirectionChange: vi.fn(),
          onSearch: vi.fn(),
          onToggle: vi.fn(),
          onQuantityChange: vi.fn(),
          onApply: vi.fn(),
          onClose: vi.fn(),
          onReasonChange,
          newItem: { onOpen: onOpenNew, onChange: vi.fn(), onSave: vi.fn(), onCancel: vi.fn() },
        },
      },
    });

    expect(screen.getByText('Escolha o motivo do descarte')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Motivo do descarte' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar item' }));
    expect(onOpenNew).toHaveBeenCalled();
  });

  // triste
  it('has no reason nor new item button when the screen does not give them', () => {
    setup();

    expect(screen.queryByRole('combobox', { name: 'Motivo do descarte' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cadastrar item' })).toBeNull();
  });
});

