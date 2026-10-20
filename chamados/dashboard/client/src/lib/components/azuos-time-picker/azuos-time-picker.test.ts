import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TimePicker from './azuos-time-picker.svelte';

const data = { label: 'Início', name: 'startTime', value: '23:59' };

describe('AzuosTimePicker', () => {
  // feliz
  it('preserves the exact hour and minute when applying a selection', async () => {
    const onChange = vi.fn();
    render(TimePicker, { props: { data, actions: { onChange } } });

    await userEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(screen.getByRole('combobox', { name: 'Hora de início' })).toHaveTextContent('23');
    expect(screen.getByRole('combobox', { name: 'Minuto de início' })).toHaveTextContent('59');
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Aplicar horário' }));

    expect(onChange).toHaveBeenCalledWith('23:59');
    expect(screen.queryByRole('button', { name: 'Aplicar horário' })).not.toBeInTheDocument();
  });

  // triste
  it('keeps the saved value when dismissed without applying', async () => {
    const onChange = vi.fn();
    render(TimePicker, { props: { data, actions: { onChange } } });

    await userEvent.click(screen.getByRole('button', { name: 'Início' }));
    await userEvent.keyboard('{Escape}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Início' })).toHaveTextContent('23:59');
  });

  // feliz
  it('applies changed hours and minutes only after confirmation', async () => {
    const onChange = vi.fn();
    render(TimePicker, { props: { data, actions: { onChange } } });
    await userEvent.click(screen.getByRole('button', { name: 'Início' }));

    const hour = screen.getByRole('combobox', { name: 'Hora de início' });
    await fireEvent.pointerDown(hour);
    await fireEvent.click(hour);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: '00' }));
    const minute = screen.getByRole('combobox', { name: 'Minuto de início' });
    await fireEvent.pointerDown(minute);
    await fireEvent.click(minute);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: '37' }));

    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar horário' }));
    expect(onChange).toHaveBeenCalledWith('00:37');
  });

  it('prevents opening while disabled', async () => {
    render(TimePicker, {
      props: { data, state: { isDisabled: true }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Início' })).toBeDisabled();
  });

  it('announces validation errors on the labeled trigger', () => {
    render(TimePicker, {
      props: { data, state: { error: 'Informe um horário válido.' }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Início' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um horário válido.');
  });
});
