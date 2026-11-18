import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { COMPANY_COLOR_PALETTE } from '$lib/utils/company-color.util';

import ColorSwatchField from './azuos-color-swatch-field.svelte';

describe('AzuosColorSwatchField', () => {
  // feliz
  it('marks the chosen palette colour and picks another one', async () => {
    const onChange = vi.fn();
    const [first, second] = COMPANY_COLOR_PALETTE;
    render(ColorSwatchField, {
      props: { data: { value: first.toUpperCase() }, actions: { onChange } },
    });

    expect(screen.getByRole('radio', { name: `Cor ${first}` })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(screen.getByRole('radio', { name: `Cor ${second}` }));

    expect(onChange).toHaveBeenCalledWith(second);
  });

  it('takes any other colour from the browser picker, in lower case', async () => {
    const onChange = vi.fn();
    const { container } = render(ColorSwatchField, {
      props: { data: { value: '' }, actions: { onChange } },
    });

    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    await fireEvent.change(input, { target: { value: '#ABCDEF' } });

    expect(onChange).toHaveBeenCalledWith('#abcdef');
  });

  // triste
  it('writes "Aleatória" for an empty value, and drops it where colour is required', () => {
    const { unmount } = render(ColorSwatchField, {
      props: { data: { value: '' }, actions: { onChange: vi.fn() } },
    });
    expect(screen.getByRole('radio', { name: 'Aleatória' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    unmount();

    render(ColorSwatchField, {
      props: { data: { value: '' }, ui: { allowRandom: false }, actions: { onChange: vi.fn() } },
    });
    expect(screen.queryByRole('radio', { name: 'Aleatória' })).not.toBeInTheDocument();
  });
});
