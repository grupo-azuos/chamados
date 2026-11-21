import { EMPTY_BOARD_FILTER_VALUES } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardFilterBar, { chosenOf, optionsOf, patchOf, PERIOD_CHOICES } from './azuos-board-filter-bar.svelte';

const PERSON = { id: 'person', kind: 'person', label: 'Pessoa', display: 'chips' } as const;

describe('board filter options', () => {
  // feliz
  it('offers "me" and the people counted in the module', () => {
    const options = optionsOf(PERSON, {
      total: 5,
      isLoading: false,
      series: [
        { key: 'Ana Lima', label: 'Ana Lima', value: 3 },
        { key: '(Sem responsável)', label: '(Sem responsável)', value: 2 },
      ],
    });

    expect(options.map((option) => option.label)).toEqual(['Eu', 'Ana Lima']);
  });

  // feliz
  it('turns a chosen period into the window, and reads it back', () => {
    const period = { id: 'periodo', kind: 'period', label: 'Período' } as const;
    const patch = patchOf(period, 'last-30');

    expect(patch).toEqual({ period: PERIOD_CHOICES[1]!.window });
    expect(chosenOf(period, { ...EMPTY_BOARD_FILTER_VALUES, ...patch })).toBe('last-30');
  });

  // triste
  it('clears the filter with the empty choice', () => {
    expect(patchOf(PERSON, '')).toEqual({ person: null });
    expect(chosenOf(PERSON, EMPTY_BOARD_FILTER_VALUES)).toBe('');
  });
});

describe('AzuosBoardFilterBar', () => {
  // feliz
  it('chooses a person with one click', async () => {
    const onChange = vi.fn();
    render(BoardFilterBar, {
      props: {
        data: {
          filters: [PERSON],
          values: EMPTY_BOARD_FILTER_VALUES,
          counts: { person: { total: 3, isLoading: false, series: [{ key: 'Ana Lima', label: 'Ana Lima', value: 3 }] } },
        },
        actions: { onChange, onClear: vi.fn() },
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Ana Lima' }));

    expect(onChange).toHaveBeenCalledWith({ person: 'Ana Lima' });
  });

  // triste
  it('offers to take a filter off only while building', async () => {
    const onRemove = vi.fn();
    const props = {
      data: { filters: [PERSON], values: EMPTY_BOARD_FILTER_VALUES, counts: {} },
      actions: { onChange: vi.fn(), onClear: vi.fn(), onRemove },
    };
    const { rerender } = render(BoardFilterBar, { props });
    expect(screen.queryByRole('button', { name: 'Tirar o filtro Pessoa' })).not.toBeInTheDocument();

    await rerender({ ...props, state: { isEditing: true } });
    await fireEvent.click(screen.getByRole('button', { name: 'Tirar o filtro Pessoa' }));

    expect(onRemove).toHaveBeenCalledWith('person');
  });
});
