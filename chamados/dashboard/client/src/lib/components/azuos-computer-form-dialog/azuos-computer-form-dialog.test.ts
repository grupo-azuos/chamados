import { fireEvent, render, screen, within } from '@testing-library/svelte';
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
    responsibleId: field(),
    departmentId: field(),
    notes: field(),
    kind: field(),
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

  it('asks whether the machine is a desktop or a notebook, and sends the choice', async () => {
    const user = userEvent.setup();
    render(ComputerFormDialog, {
      props: { data: { mode: 'create', fields: fields() }, state: { isOpen: true }, actions },
    });

    const kind = screen.getByRole('group', { name: 'Tipo' });
    await user.click(within(kind).getByRole('button', { name: 'Notebook' }));

    expect(actions.onChange).toHaveBeenCalledWith('kind', 'notebook');
  });

  // triste
  it('says why the form is waiting on the kind', () => {
    render(ComputerFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ kind: field('', 'Escolha se é desktop ou notebook') }) },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByText('Escolha se é desktop ou notebook')).toBeInTheDocument();
  });

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
  it('picks the responsible from the office directory and keeps the person id', async () => {
    const onChange = vi.fn();
    render(ComputerFormDialog, { props: {
      data: { mode: 'create', fields: fields(), responsibles: [
        { id: 'person-1', name: 'Ana Exemplo', avatarUrl: null },
      ] }, state: { isOpen: true }, actions: { ...actions, onChange },
    } });
    expect(screen.getByLabelText('Nome do dispositivo')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('combobox', { name: 'Responsável' }));
    await fireEvent.click(await screen.findByRole('option', { name: /Ana Exemplo/ }));
    expect(onChange).toHaveBeenCalledWith('responsibleId', 'person-1');
  });

  // triste
  it('never offers to use a typed name: a name nobody has finds nobody', async () => {
    const onChange = vi.fn();
    render(ComputerFormDialog, { props: {
      data: { mode: 'create', fields: fields(), responsibles: [{ id: 'person-1', name: 'Ana Exemplo', avatarUrl: null }] },
      state: { isOpen: true }, actions: { ...actions, onChange },
    } });
    expect(screen.queryByText(/Digite o nome/)).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('combobox', { name: 'Responsável' }));
    const search = await screen.findByPlaceholderText('Buscar pessoa...');
    await fireEvent.input(search, { target: { value: 'Equipe externa' } });
    expect(screen.queryByText(/Usar/)).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalledWith('responsibleId', 'Equipe externa');
  });

  // triste
  it('says the responsible cannot be chosen when the directory is unavailable', () => {
    render(ComputerFormDialog, { props: {
      data: { mode: 'create', fields: fields(), responsibles: [] },
      state: { isOpen: true, responsiblesError: 'Diretório indisponível' }, actions,
    } });
    expect(screen.getByRole('status')).toHaveTextContent('Não dá para escolher o responsável agora');
    expect(screen.getByRole('combobox', { name: 'Responsável' })).toBeDisabled();
  });

  // feliz
  it('chooses only the official department by id, with no Local field', async () => {
    const onChange = vi.fn();
    render(ComputerFormDialog, { props: {
      data: {
        mode: 'create',
        fields: fields(),
        departmentOptions: [{ value: '12', label: 'Fiscal' }],
      },
      state: { isOpen: true }, actions: { ...actions, onChange },
    } });
    await userEvent.click(screen.getByRole('button', { name: 'Departamento' }));
    await fireEvent.click(await screen.findByText('Fiscal'));
    expect(onChange).toHaveBeenCalledWith('departmentId', '12');
    expect(screen.queryByText('Local')).not.toBeInTheDocument();
    expect(screen.queryByText('RECEPÇÃO')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Observação')).toBeInTheDocument();
  });

  // feliz
  it('shows the old responsible and location lines kept in the note', () => {
    render(ComputerFormDialog, { props: {
      data: {
        mode: 'edit',
        fields: fields({ name: field('PC-1'), notes: field('Responsável anterior: Ana\nLocal anterior: RECEPÇÃO') }),
      },
      state: { isOpen: true }, actions,
    } });
    expect(screen.getByLabelText('Observação')).toHaveValue('Responsável anterior: Ana\nLocal anterior: RECEPÇÃO');
  });

  // triste
  it('explains an empty department list when HR did not answer', () => {
    render(ComputerFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), departmentOptions: [] },
        state: { isOpen: true, isRhUnavailable: true },
        actions,
      },
    });

    expect(screen.getByText('A lista do RH não carregou. Não dá para escolher o departamento agora.')).toBeInTheDocument();
  });
});
