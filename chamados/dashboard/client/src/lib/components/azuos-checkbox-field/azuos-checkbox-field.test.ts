import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CheckboxField from './azuos-checkbox-field.svelte';

describe('AzuosCheckboxField', () => {
  // feliz
  it('ticks the box by clicking its label', async () => {
    const onChange = vi.fn();
    render(CheckboxField, {
      props: {
        data: {
          label: 'Avisar por WhatsApp',
          name: 'notify',
          isChecked: false,
          description: 'Uma mensagem por andamento',
        },
        actions: { onChange },
      },
    });

    const box = screen.getByRole('checkbox', { name: 'Avisar por WhatsApp' });
    expect(box).toHaveAccessibleDescription('Uma mensagem por andamento');
    await userEvent.click(screen.getByText('Avisar por WhatsApp'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('keeps the label for screen readers when it is hidden', () => {
    render(CheckboxField, {
      props: {
        data: { label: 'Selecionar linha', name: 'row', isChecked: true },
        ui: { isLabelHidden: true },
      },
    });

    expect(screen.getByRole('checkbox', { name: 'Selecionar linha' })).toBeChecked();
    expect(screen.getByText('Selecionar linha')).toHaveClass('sr-only');
  });

  // triste
  it('does not change while disabled', async () => {
    const onChange = vi.fn();
    render(CheckboxField, {
      props: {
        data: { label: 'Avisar', name: 'notify', isChecked: false },
        state: { isDisabled: true },
        actions: { onChange },
      },
    });

    await userEvent.click(screen.getByRole('checkbox'));

    expect(onChange).not.toHaveBeenCalled();
  });

  // feliz
  /* O bits-ui marca com `data-state`: o azul da caixinha marcada precisa casar com ele. */
  it('paints the ticked box blue and keeps the empty one outlined', () => {
    render(CheckboxField, {
      props: {
        data: { label: 'Brand', name: 'brand', isChecked: true },
        actions: { onChange: vi.fn() },
      },
    });

    const box = screen.getByRole('checkbox', { name: 'Brand' });
    expect(box).toHaveAttribute('data-state', 'checked');
    expect(box.className).toContain('data-[state=checked]:bg-primary');
    expect(box.className).toContain('border-muted-foreground/60');
  });
});
