import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Harness from './azuos-command-search-item-harness.test.svelte';

describe('AzuosCommandSearchItem', () => {
  // feliz
  it('selects on click, with the item classes of the template and no hidden check at the end', async () => {
    const onSelect = vi.fn();
    render(Harness, { props: { onSelect } });

    const item = screen.getByRole('option', { name: 'Tecnologia' });
    expect(item).toHaveClass('px-2', 'py-1.5', 'rounded-chip');
    expect(item.querySelector('svg')).toBeNull();

    await userEvent.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  // triste
  it('does not select a disabled line', async () => {
    const onSelect = vi.fn();
    render(Harness, { props: { onSelect, isDisabled: true } });

    const item = screen.getByRole('option', { name: 'Tecnologia' });
    expect(item).toHaveAttribute('data-disabled');
    await userEvent.click(item).catch(() => undefined);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
