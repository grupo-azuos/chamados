import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SelectField, { SELECT_SEARCH_FROM } from './azuos-select-field.svelte';

const owners = [
  { value: '', label: 'Todos os responsáveis' },
  { value: 'Ana', label: 'Ana' },
  { value: 'Bia', label: 'Bia' },
];

describe('AzuosSelectField', () => {
  // feliz
  it('shows the label of the selected option', () => {
    render(SelectField, {
      props: {
        data: { value: 'Ana', options: owners },
        ui: { ariaLabel: 'Responsável' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('combobox', { name: 'Responsável' })).toHaveTextContent('Ana');
  });

  /* O teste acima usa uma opção cujo valor e rótulo são iguais ("Ana"), então ele passaria
     mesmo se o campo mostrasse o valor cru. Este aqui separa os dois de propósito. */
  // feliz
  it('shows the label, not the stored value, before the list is opened', () => {
    render(SelectField, {
      props: {
        data: {
          value: 'network',
          options: [
            { value: 'network', label: 'Internet / Rede' },
            { value: 'printer', label: 'Impressora' },
          ],
        },
        ui: { ariaLabel: 'Tipo de problema' },
        actions: { onChange: vi.fn() },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Tipo de problema' });
    expect(trigger).toHaveTextContent('Internet / Rede');
    expect(trigger).not.toHaveTextContent('network');
  });

  // triste
  it('shows the placeholder when nothing was chosen', () => {
    render(SelectField, {
      props: {
        data: { value: '', options: [{ value: 'network', label: 'Internet / Rede' }] },
        ui: { ariaLabel: 'Tipo de problema', placeholder: 'Selecione' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('combobox', { name: 'Tipo de problema' })).toHaveTextContent(
      'Selecione',
    );
  });

  /* `fireEvent`, não `userEvent`, para abrir e escolher: o jsdom não calcula layout de
     verdade, e o `userEvent` do bits-ui Select — que abre num portal, fora da árvore do
     componente — fica preso esperando um estado de "visível" que o jsdom nunca resolve.
     `fireEvent` dispara o evento direto, sem essa checagem de geometria.
     bits-ui SelectItemState usa `onpointerup` (não `onclick`) para selecionar — por isso
     usamos `fireEvent.pointerUp` no item, não `fireEvent.click`. */

  // feliz
  it('picking an option calls onChange with its value', async () => {
    const onChange = vi.fn();

    render(SelectField, {
      props: {
        data: { value: '', options: owners },
        ui: { ariaLabel: 'Responsável', placeholder: 'Todos os responsáveis' },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    await fireEvent.pointerDown(trigger);
    await fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Ana' });
    await fireEvent.pointerUp(option);

    expect(onChange).toHaveBeenCalledWith('Ana');
  });

  // triste
  it('picking the empty option returns an empty string, not the internal sentinel', async () => {
    const onChange = vi.fn();

    render(SelectField, {
      props: {
        data: { value: 'Ana', options: owners },
        ui: { ariaLabel: 'Responsável' },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    await fireEvent.pointerDown(trigger);
    await fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Todos os responsáveis' });
    await fireEvent.pointerUp(option);

    expect(onChange).toHaveBeenCalledWith('');
  });

  // triste
  it('does not open the menu when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(SelectField, {
      props: {
        data: { value: '', options: owners },
        ui: { ariaLabel: 'Responsável' },
        state: { isDisabled: true },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});

const people = [
  { value: 'ana', label: 'Ana Souza', personName: 'Ana Souza', avatarUrl: null },
  { value: 'caio', label: 'Caio Ribeiro', personName: 'Caio Ribeiro' },
];

describe('AzuosSelectField with people and in the dark theme', () => {
  // feliz
  it('shows the initials of the chosen person, on the solid field fill', () => {
    render(SelectField, {
      props: { data: { value: 'ana', options: people }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: vi.fn() } },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    expect(trigger).toHaveTextContent('AS');
    /* O `ui/select` traz `dark:bg-input/30`; o campo repete o fundo sólido no escuro. */
    expect(trigger).toHaveClass('bg-muted', 'dark:bg-muted', 'min-w-40');
    expect(trigger).not.toHaveClass('dark:bg-input/30');
  });

  // triste
  it('draws no avatar for an option that is not a person', () => {
    render(SelectField, {
      props: { data: { value: 'Ana', options: owners }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: vi.fn() } },
    });

    expect(document.querySelector('[data-slot="avatar"]')).toBeNull();
  });

  // triste
  it('says there is nothing to pick instead of opening an empty list', async () => {
    render(SelectField, {
      props: {
        data: { value: '', options: [] },
        ui: { ariaLabel: 'Responsável' },
        actions: { onChange: vi.fn() },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    await fireEvent.pointerDown(trigger);
    await fireEvent.click(trigger);

    expect(await screen.findByText('Nenhuma opção disponível')).toBeInTheDocument();
    expect(screen.queryByRole('option')).toBeNull();
  });

  // triste
  it('keeps the 40px of the fields, over the 36px of the downloaded select', () => {
    render(SelectField, {
      props: { data: { value: 'Ana', options: owners }, ui: { ariaLabel: 'Responsável' }, actions: { onChange: vi.fn() } },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    expect(trigger).toHaveAttribute('data-size', 'default');
    expect(trigger).toHaveClass('data-[size=default]:h-(--control-lg)');
  });

  // feliz
  /* A lista que cresceu com o cadastro vira busca sozinha: 15 opções ou mais, o combobox. */
  it('turns into the combobox with search from fifteen options on', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const options = Array.from({ length: SELECT_SEARCH_FROM }, (_, index) => ({
      value: `d${index}`,
      label: `Departamento ${index}`,
    }));
    render(SelectField, { props: { data: { value: '', options }, ui: { ariaLabel: 'Departamento' }, actions: { onChange } } });

    await user.click(screen.getByRole('combobox', { name: 'Departamento' }));
    await user.click(await screen.findByRole('option', { name: 'Departamento 7' }));

    expect(onChange).toHaveBeenCalledWith('d7');
  });

  // triste
  it('keeps the simple select below fifteen options', () => {
    const options = Array.from({ length: SELECT_SEARCH_FROM - 1 }, (_, index) => ({ value: `d${index}`, label: `D${index}` }));
    render(SelectField, { props: { data: { value: '', options }, ui: { ariaLabel: 'Departamento' }, actions: { onChange: vi.fn() } } });

    expect(document.querySelector('[data-slot="select-value"]')).not.toBeNull();
  });
});
