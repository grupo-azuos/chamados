import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Picker from './azuos-traceability-picker.svelte';

function setup(
  over: Partial<{ focus: 'computer' | 'department' | 'person'; picks: unknown[] }> = {},
) {
  const actions = {
    onSearch: vi.fn(),
    onDepartmentChange: vi.fn(),
    onPick: vi.fn(),
    onClose: vi.fn(),
  };
  render(Picker, {
    props: {
      data: {
        focus: over.focus ?? 'computer',
        picks: (over.picks as never) ?? [
          {
            id: '4',
            title: 'Computador 04',
            subtitle: 'PARALEGAL-D04',
            detail: 'Ana Souza · Paralegal',
            departmentKey: '7',
            isOnline: false,
          },
        ],
        selectedId: '',
        search: '',
        department: '',
        departments: [{ value: '7', label: 'Paralegal' }],
      },
      state: { isOpen: true },
      actions,
    },
  });
  return actions;
}

describe('AzuosTraceabilityPicker', () => {
  // feliz
  it('searches like "Máquinas do chamado" and picks the card touched', async () => {
    const actions = setup();

    expect(screen.getByText('Escolha o computador')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Buscar'), 'p');
    expect(actions.onSearch).toHaveBeenCalledWith('p');
    await userEvent.click(screen.getByRole('button', { name: /Computador 04/ }));
    expect(actions.onPick).toHaveBeenCalledWith('4');
  });

  // triste
  it('says when nothing is found, and has no department filter for a department', () => {
    setup({ focus: 'department', picks: [] });

    expect(screen.getByText('Nenhum departamento encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Todos os departamentos')).not.toBeInTheDocument();
  });
});
