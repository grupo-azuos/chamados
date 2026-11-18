import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import FormComboboxField from './azuos-form-combobox-field.svelte';

const options = [
  { value: 'fin', label: 'Financeiro' },
  { value: 'ti', label: 'Tecnologia' },
];

describe('AzuosFormComboboxField', () => {
  // feliz
  it('is named by its label, describes the hint and validates on choosing', async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(FormComboboxField, {
      props: {
        data: { label: 'Departamento', value: '', options, hint: 'A lista vem do RH' },
        actions: { onChange, onBlur },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Departamento' });
    expect(trigger).toHaveAccessibleDescription('A lista vem do RH');
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: /Tecnologia/ }));

    expect(onChange).toHaveBeenCalledWith('ti');
    expect(onBlur).toHaveBeenCalledOnce();
  });

  // triste
  it('shows the error instead of the hint and marks the field invalid', () => {
    render(FormComboboxField, {
      props: {
        data: { label: 'Departamento', value: '', options, hint: 'A lista vem do RH' },
        state: { error: 'Escolha um departamento', isRequired: true },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um departamento');
    expect(screen.queryByText('A lista vem do RH')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('AzuosFormComboboxField — without a visible label or a hint', () => {
  // feliz
  it('is named by the aria label and describes nothing when there is no hint', () => {
    render(FormComboboxField, {
      props: { data: { value: 'ti', options }, ui: { ariaLabel: 'Setor' }, actions: { onChange: vi.fn() } },
    });

    const trigger = screen.getByRole('combobox', { name: 'Setor' });
    expect(trigger).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Departamento')).not.toBeInTheDocument();
  });
});
