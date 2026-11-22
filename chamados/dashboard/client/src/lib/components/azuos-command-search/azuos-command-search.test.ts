import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Harness from './azuos-command-search-harness.test.svelte';

const options = ['Financeiro', 'Recursos Humanos', 'Tecnologia'];

describe('AzuosCommandSearch', () => {
  // feliz
  it('draws the flat search row of the template and filters while typing', async () => {
    const onTermChange = vi.fn();
    render(Harness, { props: { options, onTermChange } });

    const input = screen.getByPlaceholderText('Buscar departamento');
    /* A linha reta do template: 36px, fio embaixo, sem pílula nem respiro em volta. */
    expect(input.closest('[data-slot="command-input-wrapper"]')).toHaveClass('h-9', 'border-b', 'px-3');
    expect(input).toHaveClass('bg-transparent');

    await userEvent.type(input, 'tecno');

    expect(onTermChange).toHaveBeenLastCalledWith('tecno');
    expect(screen.getByRole('option', { name: 'Tecnologia' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Financeiro' })).not.toBeInTheDocument();
  });

  // feliz
  it('chooses a line with the keyboard', async () => {
    const onSelect = vi.fn();
    render(Harness, { props: { options, onSelect } });

    await userEvent.click(screen.getByPlaceholderText('Buscar departamento'));
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith('Recursos Humanos');
  });

  // triste
  it('says nothing was found when the search hides every line', async () => {
    render(Harness, { props: { options, emptyLabel: 'Nenhum departamento' } });

    await userEvent.type(screen.getByPlaceholderText('Buscar departamento'), 'zzz');

    expect(screen.getByText('Nenhum departamento')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
