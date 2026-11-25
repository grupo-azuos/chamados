import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import NewItemForm from './azuos-ticket-stock-new-item.svelte';

const VALUES = { name: 'Fonte ATX', quantity: '2', category: '', condition: 'new', unit: 'unit' };

function setup(source: 'parts' | 'inventory', errors = {}) {
  const actions = { onChange: vi.fn(), onSave: vi.fn(), onCancel: vi.fn() };
  render(NewItemForm, { props: { data: { source, values: VALUES, errors }, actions } });

  return actions;
}

describe('AzuosTicketStockNewItem', () => {
  // feliz
  it('asks the condition for a TI part, and saves', async () => {
    const actions = setup('parts');

    expect(screen.getByLabelText('Nome do item')).toHaveValue('Fonte ATX');
    expect(screen.getByText('Condição')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Medida' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar e marcar' }));
    expect(actions.onSave).toHaveBeenCalled();
  });

  // triste
  it('asks the measure for a Maintenance product, and shows what is missing', async () => {
    const actions = setup('inventory', { category: 'Escolha a categoria' });

    expect(screen.getByRole('combobox', { name: 'Medida' })).toBeInTheDocument();
    expect(screen.getAllByText('Escolha a categoria').length).toBeGreaterThan(0);
    expect(screen.queryByText('Condição')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(actions.onCancel).toHaveBeenCalled();
  });
});
