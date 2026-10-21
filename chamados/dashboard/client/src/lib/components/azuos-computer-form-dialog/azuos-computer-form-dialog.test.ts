import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import ComputerFormDialog, { type ComputerFormField } from './azuos-computer-form-dialog.svelte';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

function fields(
  over: Partial<Record<ComputerFormField, FormFieldState>> = {},
): Record<ComputerFormField, FormFieldState> {
  return {
    name: field(),
    displayName: field(),
    responsibleName: field(),
    department: field(),
    ...over,
  };
}

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('AzuosComputerFormDialog', () => {
  // feliz
  it('asks for the machine name when registering a new one', () => {
    render(ComputerFormDialog, {
      props: { data: { mode: 'create', fields: fields() }, state: { isOpen: true }, actions },
    });

    expect(screen.getByLabelText('Nome da máquina')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar computador' })).toBeInTheDocument();
  });

  it('sends what was typed when the form is submitted', async () => {
    const user = userEvent.setup();
    render(ComputerFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ name: field('RECEPCAO-01') }) },
        state: { isOpen: true },
        actions,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Cadastrar computador' }));

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  /* Depois de cadastrada, quem informa o nome é a própria máquina: um campo editável aqui
     faria a ficha discordar do que o agente manda na leitura seguinte. */
  it('does not let the machine name be edited after it exists', () => {
    render(ComputerFormDialog, {
      props: {
        data: { mode: 'edit', fields: fields({ name: field('RECEPCAO-01') }) },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.queryByLabelText('Nome da máquina')).not.toBeInTheDocument();
    expect(screen.getByText('RECEPCAO-01')).toBeInTheDocument();
  });

  it('shows the field error right under the field', () => {
    render(ComputerFormDialog, {
      props: {
        data: {
          mode: 'create',
          fields: fields({ name: field('', 'Informe o nome da máquina') }),
        },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByText('Informe o nome da máquina')).toBeInTheDocument();
  });

  /* A recusa do servidor aparece DENTRO do modal, que continua aberto com o que foi digitado. */
  it('keeps the form open and shows why the server refused', () => {
    render(ComputerFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ name: field('RECEPCAO-01') }) },
        state: { isOpen: true, error: 'Já existe uma máquina com esse nome.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma máquina com esse nome.');
    expect(screen.getByDisplayValue('RECEPCAO-01')).toBeInTheDocument();
  });
});


describe('AzuosComputerFormDialog responsible directory', () => {
  // feliz
  it('names the display field and selects a directory person by name', async () => {
    const onChange = vi.fn();
    render(ComputerFormDialog, { props: {
      data: { mode: 'create', fields: fields(), responsibles: [
        { id: 'person-1', name: 'Ana Exemplo', email: 'ana@exemplo.invalid' },
      ] }, state: { isOpen: true }, actions: { ...actions, onChange },
    } });
    expect(screen.getByLabelText('Nome do dispositivo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Responsável', exact: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Ana Exemplo · ana@exemplo.invalid' }));
    expect(onChange).toHaveBeenCalledWith('responsibleName', 'Ana Exemplo');
  });

  // triste
  it('allows a free name when the directory is unavailable', async () => {
    const onChange = vi.fn();
    render(ComputerFormDialog, { props: {
      data: { mode: 'create', fields: fields(), responsibles: [] },
      state: { isOpen: true, responsiblesError: 'Diretório indisponível' }, actions: { ...actions, onChange },
    } });
    expect(screen.getByRole('status')).toHaveTextContent('A lista de pessoas não carregou');
    await userEvent.click(screen.getByRole('button', { name: 'Responsável', exact: true }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar pessoa ou digitar nome…' }), 'Equipe externa');
    await userEvent.click(screen.getByRole('button', { name: 'Usar “Equipe externa”' }));
    expect(onChange).toHaveBeenCalledWith('responsibleName', 'Equipe externa');
  });
});
