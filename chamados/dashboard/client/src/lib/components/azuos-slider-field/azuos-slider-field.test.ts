import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import SliderField from './azuos-slider-field.svelte';

const data = { label: 'Tamanho do texto', value: 14, min: 12, max: 20, step: 1 };

describe('AzuosSliderField', () => {
  // feliz
  it('gives the handle its name and value', () => {
    render(SliderField, { props: { data } });

    const thumb = screen.getByRole('slider', { name: 'Tamanho do texto' });
    expect(thumb).toHaveAttribute('aria-valuenow', '14');
    expect(thumb).toHaveAttribute('aria-valuemin', '12');
    expect(thumb).toHaveAttribute('aria-valuemax', '20');
  });

  it('moves one step with the arrow key', async () => {
    const onChange = vi.fn();
    render(SliderField, { props: { data, actions: { onChange } } });

    await fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith(15);
  });

  // triste
  it('does not move while disabled', async () => {
    const onChange = vi.fn();
    render(SliderField, { props: { data, state: { isDisabled: true }, actions: { onChange } } });

    await fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
