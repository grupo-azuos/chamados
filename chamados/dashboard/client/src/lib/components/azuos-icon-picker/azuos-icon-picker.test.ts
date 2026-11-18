import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Monitor from '@lucide/svelte/icons/monitor';
import Printer from '@lucide/svelte/icons/printer';
import { describe, expect, it, vi } from 'vitest';

import IconPicker from './azuos-icon-picker.svelte';

const options = [
  { value: 'monitor', label: 'Monitor', icon: Monitor },
  { value: 'printer', label: 'Impressora', icon: Printer },
];

describe('AzuosIconPicker', () => {
  // feliz
  it('names each icon in Portuguese and picks one', async () => {
    const onChange = vi.fn();
    render(IconPicker, {
      props: { data: { value: 'monitor', options }, ui: { label: 'Ícone' }, actions: { onChange } },
    });

    expect(screen.getByRole('group', { name: 'Ícone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monitor' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Impressora' }));

    expect(onChange).toHaveBeenCalledWith('printer');
  });

  // triste
  it('has nothing pressed when no icon was chosen yet', () => {
    render(IconPicker, {
      props: {
        data: { value: null, options },
        ui: { label: 'Ícone' },
        actions: { onChange: vi.fn() },
      },
    });

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('does not pick while disabled', async () => {
    const onChange = vi.fn();
    render(IconPicker, {
      props: {
        data: { value: null, options },
        ui: { label: 'Ícone' },
        state: { isDisabled: true },
        actions: { onChange },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Monitor' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
