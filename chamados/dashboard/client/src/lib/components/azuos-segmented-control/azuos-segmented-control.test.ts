import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SegmentedControl from './azuos-segmented-control.svelte';

const options = [
  { value: 'open', label: 'Abertos' },
  { value: 'done', label: 'Resolvidos' },
];

describe('AzuosSegmentedControl', () => {
  // feliz
  it('tells which option is on and switches to another one', async () => {
    const onChange = vi.fn();
    render(SegmentedControl, {
      props: {
        data: { value: 'open', options },
        ui: { ariaLabel: 'Recorte' },
        actions: { onChange },
      },
    });

    expect(screen.getByRole('button', { name: 'Abertos' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Resolvidos' }));

    expect(onChange).toHaveBeenCalledWith('done');
  });

  // triste
  it('does not call onChange again for the option already on', async () => {
    const onChange = vi.fn();
    render(SegmentedControl, {
      props: {
        data: { value: 'open', options },
        ui: { ariaLabel: 'Recorte' },
        actions: { onChange },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Abertos' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('locks every option when disabled', () => {
    render(SegmentedControl, {
      props: {
        data: { value: 'open', options },
        ui: { ariaLabel: 'Recorte' },
        state: { isDisabled: true },
        actions: { onChange: vi.fn() },
      },
    });

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});

describe('AzuosSegmentedControl — the prominent variant', () => {
  // feliz
  it('draws bigger options without the tray, marking the active one', () => {
    render(SegmentedControl, {
      props: { data: { value: 'open', options }, ui: { ariaLabel: 'Situação', variant: 'prominent' }, actions: { onChange: vi.fn() } },
    });
    const group = screen.getByRole('group', { name: 'Situação' });
    expect(group).toHaveClass('bg-transparent');
    expect(screen.getByRole('button', { name: 'Abertos' })).toHaveClass('control-lg');
  });
});
