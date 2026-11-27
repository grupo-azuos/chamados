import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RoleFormDialog, { type AzuosRoleFormDialogProps } from './azuos-role-form-dialog.svelte';

const fields = {
  userId: { value: '', error: null },
  userEmail: { value: '', error: null },
};

function renderDialog(overrides: Partial<AzuosRoleFormDialogProps> = {}) {
  const actions = {
    onContextsChange: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
  };

  render(RoleFormDialog, {
    props: {
      data: { mode: 'create', fields, contexts: [] },
      state: { isOpen: true },
      actions,
      ...overrides,
    },
  });

  return actions;
}

describe('AzuosRoleFormDialog', () => {
  // feliz
  it('renders title for create mode and triggers submit', async () => {
    const actions = renderDialog();

    expect(screen.getByRole('heading', { name: 'Liberar módulos' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Liberar módulos' }));
    expect(actions.onSubmit).toHaveBeenCalledOnce();
  });

  it('allows choosing the module by its checkbox', async () => {
    const actions = renderDialog();

    await userEvent.click(screen.getByRole('checkbox', { name: /Infraestrutura/i }));
    expect(actions.onContextsChange).toHaveBeenCalledWith(['infra']);
  });

  it('keeps the other selections when a module is removed', async () => {
    const actions = renderDialog({
      data: { mode: 'create', fields, contexts: ['infra', 'sistema'] },
    });

    expect(screen.getByRole('checkbox', { name: /Sistema/i })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: /Infraestrutura/i }));
    expect(actions.onContextsChange).toHaveBeenCalledWith(['sistema']);
    expect(screen.getByRole('button', { name: 'Liberar 2 módulos' })).toBeInTheDocument();
  });

  /* O nível não se escolhe aqui: ele vem do papel no admin-console. */
  it('offers no level to choose, only the module', () => {
    renderDialog();

    expect(screen.queryByRole('button', { name: /^Gestor/i })).not.toBeInTheDocument();
    expect(screen.getByText(/vem do papel dela no/i)).toBeInTheDocument();
  });

  it('disables context selection in edit mode', () => {
    renderDialog({ data: { mode: 'edit', fields, contexts: ['sistema'] } });

    expect(screen.getByRole('checkbox', { name: /Infraestrutura/i })).toBeDisabled();
  });

  // triste
  it('shows error state when provided', () => {
    renderDialog({
      state: { isOpen: true, error: 'Falha de comunicação com o servidor' },
    });

    expect(screen.getByText('Falha de comunicação com o servidor')).toBeInTheDocument();
  });

  it('lists directory users and allows picking a user via the person field', async () => {
    const mockUsers = [
      {
        id: 'usr_carlos',
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com.br',
        role: 'manager',
      },
    ];

    const actions = renderDialog({
      data: { mode: 'create', users: mockUsers, fields, contexts: [] },
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Pessoa' }));
    await userEvent.click(await screen.findByRole('option', { name: /Carlos Oliveira/ }));

    expect(actions.onChange).toHaveBeenCalledWith('userId', 'usr_carlos');
    expect(actions.onChange).toHaveBeenCalledWith('userEmail', 'carlos@empresa.com.br');
  });

  it('filters users by name inside the person field', async () => {
    const mockUsers = [
      { id: 'usr_carlos', name: 'Carlos Oliveira', email: 'carlos@empresa.com.br' },
      { id: 'usr_mariana', name: 'Mariana Silva', email: 'mariana@empresa.com.br' },
    ];

    renderDialog({ data: { mode: 'create', users: mockUsers, fields, contexts: [] } });

    await userEvent.click(screen.getByRole('combobox', { name: 'Pessoa' }));
    await userEvent.type(await screen.findByPlaceholderText('Buscar pessoa...'), 'Mariana');

    expect(screen.queryByRole('option', { name: /Carlos Oliveira/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Mariana Silva/ })).toBeInTheDocument();
  });

  it('shows the chosen person in the field', () => {
    renderDialog({
      data: {
        mode: 'create',
        fields: {
          userId: { value: 'usr_carlos', error: null },
          userEmail: { value: 'carlos@empresa.com.br', error: null },
        },
        contexts: [],
        users: [{ id: 'usr_carlos', name: 'Carlos Oliveira', email: 'carlos@empresa.com.br' }],
      },
    });

    expect(screen.getByRole('combobox', { name: 'Pessoa' })).toHaveTextContent('Carlos Oliveira');
  });
});

describe('AzuosRoleFormDialog — picking people and the edit mode', () => {
  const users = [
    { id: 'usr_carlos', name: 'Carlos Oliveira', email: 'carlos@empresa.com.br', role: 'manager' },
    { id: 'usr_mariana', name: 'Mariana Silva', email: 'mariana@empresa.com.br' },
  ];
  const chosen = {
    userId: { value: 'usr_carlos', error: null },
    userEmail: { value: 'carlos@empresa.com.br', error: null },
  };

  // feliz
  it('hands the picked person to the dedicated callback', async () => {
    const onSelectUser = vi.fn();
    const actions = {
      onContextsChange: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      onSubmit: vi.fn(),
      onClose: vi.fn(),
      onSelectUser,
    };
    render(RoleFormDialog, {
      props: {
        data: { mode: 'create', users, fields: chosen, contexts: [] },
        state: { isOpen: true },
        actions,
      },
    });

    /* Trocar de pessoa é escolher outra na lista: o campo mostra quem está escolhido. */
    await userEvent.click(screen.getByRole('combobox', { name: 'Pessoa' }));
    await userEvent.click(await screen.findByRole('option', { name: /Mariana Silva/ }));

    expect(onSelectUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'usr_mariana' }));
    expect(actions.onChange).not.toHaveBeenCalled();
  });

  // triste
  it('explains a search without results and the loading of people', async () => {
    renderDialog({ data: { mode: 'create', users, fields, contexts: [] } });
    await userEvent.click(screen.getByRole('combobox', { name: 'Pessoa' }));
    await userEvent.type(await screen.findByPlaceholderText('Buscar pessoa...'), 'zzz');
    expect(await screen.findByText('Ninguém com esse nome')).toBeInTheDocument();

    cleanup();
    renderDialog({
      data: { mode: 'create', users, fields, contexts: [] },
      state: { isOpen: true, isLoadingUsers: true },
    });
    const field = screen.getByRole('combobox', { name: 'Pessoa' });
    expect(field).toBeDisabled();
    expect(field).toHaveTextContent('Carregando lista de pessoas…');
  });

  // triste
  it('keeps a chosen person that is not in the directory and shows the field error', () => {
    renderDialog({
      data: {
        mode: 'create',
        users,
        fields: {
          userId: { value: 'usr_x', error: 'Escolha uma pessoa' },
          userEmail: { value: 'x@empresa.com.br', error: null },
        },
        contexts: ['infra', 'sistema', 'manutencao'],
        contextsError: 'Escolha ao menos um módulo',
      },
    });

    const field = screen.getByRole('combobox', { name: 'Pessoa' });
    expect(field).toHaveTextContent('x@empresa.com.br');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Escolha uma pessoa')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha ao menos um módulo');
    expect(screen.getByRole('button', { name: 'Liberar 3 módulos' })).toBeInTheDocument();
  });

  // triste
  it('ignores a pick that is not a directory person', async () => {
    const actions = renderDialog({
      data: {
        mode: 'create',
        users,
        fields: { userId: { value: 'usr_x', error: null }, userEmail: { value: '', error: null } },
        contexts: [],
      },
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Pessoa' }));
    await userEvent.click(await screen.findByRole('option', { name: /usr_x/ }));

    expect(actions.onChange).not.toHaveBeenCalled();
  });

  // feliz
  it('shows the existing person in edit mode and counts a single module', () => {
    renderDialog({
      data: { mode: 'edit', users, fields: chosen, contexts: ['infra'] },
      state: { isOpen: true, error: 'Sem permissão.' },
    });
    expect(screen.getByText('Pessoa existente')).toBeInTheDocument();
    expect(screen.getByText('carlos@empresa.com.br')).toBeInTheDocument();
    expect(screen.getByText('ID: usr_carlos')).toBeInTheDocument();
    expect(screen.getByText('1 módulo selecionado.')).toBeInTheDocument();
    expect(screen.getByText('Sem permissão.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Infraestrutura/i })).toBeDisabled();
    expect(screen.queryByRole('combobox', { name: 'Pessoa' })).not.toBeInTheDocument();
  });

  // feliz
  it('submits with Enter and closes on Cancelar', async () => {
    const actions = renderDialog();
    await fireEvent.submit(screen.getByRole('button', { name: 'Cancelar' }).closest('form')!);
    expect(actions.onSubmit).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(actions.onClose).toHaveBeenCalledOnce();
  });
});

describe('AzuosRoleFormDialog — closing and loading people', () => {
  // feliz
  it('closes with Escape, like any dialog', async () => {
    const actions = renderDialog();

    await userEvent.keyboard('{Escape}');

    expect(actions.onClose).toHaveBeenCalledOnce();
  });

  // triste
  it('says the people are still loading', () => {
    renderDialog({ state: { isOpen: true, isLoadingUsers: true } });

    expect(document.body.textContent).toMatch(/Carregando/);
  });
});
