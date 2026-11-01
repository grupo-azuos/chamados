import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MultiSelectField, {
  summarizeSelection,
  targetIndex,
} from './azuos-multi-select-field.svelte';

const options = [
  { value: 'infra', label: 'Infraestrutura' },
  { value: 'sistema', label: 'Sistemas' },
  { value: 'manutencao', label: 'Manutenção' },
];
const base = { options, placeholder: 'Todas as áreas', noun: 'áreas' };

describe('AzuosMultiSelectField', () => {
  // feliz
  it('ticks an option and returns the list in the order of the options', async () => {
    const onChange = vi.fn();
    render(MultiSelectField, {
      props: {
        data: { ...base, values: ['manutencao'] },
        ui: { ariaLabel: 'Área' },
        actions: { onChange },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Área: Manutenção' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Infraestrutura' }));

    expect(onChange).toHaveBeenCalledWith(['infra', 'manutencao']);
  });

  it('summarises one or two by name and three or more by count', () => {
    expect(summarizeSelection({ ...base, values: [] })).toBe('Todas as áreas');
    expect(summarizeSelection({ ...base, values: ['sistema', 'infra'] })).toBe(
      'Infraestrutura, Sistemas',
    );
    expect(summarizeSelection({ ...base, values: ['infra', 'sistema', 'manutencao'] })).toBe(
      '3 áreas',
    );
  });

  // triste
  it('cannot clear what is already empty', async () => {
    const onChange = vi.fn();
    render(MultiSelectField, { props: { data: { ...base, values: [] }, actions: { onChange } } });

    await userEvent.click(screen.getByRole('button', { name: 'Todas as áreas: Todas as áreas' }));

    expect(await screen.findByRole('button', { name: 'Limpar' })).toBeDisabled();
  });

  it('wraps the arrows around and starts from the first box', () => {
    expect(targetIndex(1, 2, 3)).toBe(0);
    expect(targetIndex(-1, 0, 3)).toBe(2);
    expect(targetIndex(1, -1, 3)).toBe(0);
    expect(targetIndex('last', 0, 3)).toBe(2);
  });
});
