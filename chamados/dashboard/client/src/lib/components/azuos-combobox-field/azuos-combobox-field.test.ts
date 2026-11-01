import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComboboxField, { canCreateOption } from './azuos-combobox-field.svelte';

const options = [
  { value: 'fin', label: 'Financeiro' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'ti', label: 'Tecnologia' },
];

describe('AzuosComboboxField', () => {
  // feliz
  it('shows the chosen option and picks another one from the search', async () => {
    const onChange = vi.fn();
    render(ComboboxField, {
      props: {
        data: { value: 'fin', options },
        ui: { ariaLabel: 'Departamento' },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Departamento' });
    expect(trigger).toHaveTextContent('Financeiro');
    await userEvent.click(trigger);
    await userEvent.type(await screen.findByPlaceholderText('Pesquisar…'), 'tecno');
    await userEvent.click(await screen.findByRole('option', { name: /Tecnologia/ }));

    expect(onChange).toHaveBeenCalledWith('ti');
  });

  it('offers to create what was typed and not found', async () => {
    const onCreate = vi.fn();
    render(ComboboxField, {
      props: {
        data: { value: '', options },
        ui: { ariaLabel: 'Departamento' },
        actions: { onChange: vi.fn(), onCreate },
      },
    });

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.type(await screen.findByPlaceholderText('Pesquisar…'), 'Jurídico');
    await userEvent.click(await screen.findByRole('option', { name: /Criar “Jurídico”/ }));

    expect(onCreate).toHaveBeenCalledWith('Jurídico');
  });

  // triste
  it('does not offer to create a name that already exists, nor without the action', () => {
    expect(canCreateOption(options, 'financeiro', vi.fn())).toBe(false);
    expect(canCreateOption(options, 'Jurídico')).toBe(false);
    expect(canCreateOption(options, '', vi.fn())).toBe(false);
  });

  it('shows the placeholder, never a raw value, with nothing chosen', () => {
    render(ComboboxField, {
      props: {
        data: { value: 'xyz', options },
        ui: { placeholder: 'Selecione…' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('combobox')).toHaveTextContent('Selecione…');
  });
});
