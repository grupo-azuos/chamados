import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RoleFormDialog, { type AzuosRoleFormDialogProps } from './azuos-role-form-dialog.svelte';

const fields = {
  userId: { value: '', error: null },
  userEmail: { value: '', error: null },
};

function renderDialog(overrides: Partial<AzuosRoleFormDialogProps> = {}) {
  const actions = { onContextsChange: vi.fn(), onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn() };

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

  it('allows choosing the module via interactive cards', async () => {
    const actions = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /Infraestrutura/i }));
    expect(actions.onContextsChange).toHaveBeenCalledWith(['infra']);
  });

  it('keeps the other selections when a module is removed', async () => {
    const actions = renderDialog({ data: { mode: 'create', fields, contexts: ['infra', 'sistema'] } });

    expect(screen.getByRole('button', { name: /Sistema/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Infraestrutura/i }));
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

    const infraBtn = screen.getByRole('button', { name: /Infraestrutura/i });
    expect(infraBtn).toBeDisabled();
  });

  // triste
  it('shows error state when provided', () => {
    renderDialog({
      state: { isOpen: true, error: 'Falha de comunicação com o servidor' },
    });

    expect(screen.getByText('Falha de comunicação com o servidor')).toBeInTheDocument();
  });

  it('lists directory users and allows picking a user via combobox', async () => {
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

    // Clica no combobox para abrir as opções
    await userEvent.click(screen.getByRole('button', { name: /Selecionar pessoa da lista/i }));

    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText('carlos@empresa.com.br')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Carlos Oliveira'));
    expect(actions.onChange).toHaveBeenCalledWith('userId', 'usr_carlos');
    expect(actions.onChange).toHaveBeenCalledWith('userEmail', 'carlos@empresa.com.br');
  });

  it('filters users by search query inside combobox', async () => {
    const mockUsers = [
      { id: 'usr_carlos', name: 'Carlos Oliveira', email: 'carlos@empresa.com.br' },
      { id: 'usr_mariana', name: 'Mariana Silva', email: 'mariana@empresa.com.br' },
    ];

    renderDialog({
      data: { mode: 'create', users: mockUsers, fields, contexts: [] },
    });

    await userEvent.click(screen.getByRole('button', { name: /Selecionar pessoa da lista/i }));
    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar colaborador por nome/i);
    await userEvent.type(searchInput, 'Mariana');

    expect(screen.queryByText('Carlos Oliveira')).not.toBeInTheDocument();
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
  });

  it('renders selected user card and allows changing person', async () => {
    const selectedFields = {
      ...fields,
      userId: { value: 'usr_carlos', error: null },
      userEmail: { value: 'carlos@empresa.com.br', error: null },
    };

    const actions = renderDialog({
      data: {
        mode: 'create',
        fields: selectedFields,
        contexts: [],
        users: [{ id: 'usr_carlos', name: 'Carlos Oliveira', email: 'carlos@empresa.com.br' }],
      },
    });

    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Selecionada')).toBeInTheDocument();

    const changeBtn = screen.getByRole('button', { name: 'Trocar pessoa' });
    await userEvent.click(changeBtn);
    expect(actions.onChange).toHaveBeenCalledWith('userId', '');
    expect(actions.onChange).toHaveBeenCalledWith('userEmail', '');
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
  it('hands the picked and the cleared person to the dedicated callbacks', async () => {
    const onSelectUser = vi.fn();
    const onClearUser = vi.fn();
    const actions = { onContextsChange: vi.fn(), onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(), onSelectUser, onClearUser };
    render(RoleFormDialog, {
      props: { data: { mode: 'create', users, fields, contexts: [] }, state: { isOpen: true }, actions },
    });

    await userEvent.click(screen.getByRole('button', { name: /Selecionar pessoa da lista/i }));
    await userEvent.click(screen.getByText('Mariana Silva'));
    expect(onSelectUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'usr_mariana' }));
    expect(actions.onChange).not.toHaveBeenCalled();

    cleanup();
    render(RoleFormDialog, {
      props: { data: { mode: 'create', users, fields: chosen, contexts: [] }, state: { isOpen: true }, actions },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Trocar pessoa' }));
    expect(onClearUser).toHaveBeenCalledOnce();
  });

  // feliz
  it('marks the already chosen person in the list and shows her role', async () => {
    renderDialog({ data: { mode: 'create', users, fields: chosen, contexts: [] } });

    expect(screen.getByText('Gestor')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Alterar pessoa selecionada/i }));
    const list = screen.getByRole('listbox', { name: 'Lista de colaboradores' });
    const options = within(list).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(within(list).getAllByText('Gestor').length).toBeGreaterThan(0);
  });

  // triste
  it('explains an empty list, a search without results and the loading of people', async () => {
    renderDialog({ data: { mode: 'create', users: [], fields, contexts: [] } });
    await userEvent.click(screen.getByRole('button', { name: /Selecionar pessoa da lista/i }));
    expect(screen.getByText('Nenhuma pessoa disponível no diretório.')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/Buscar colaborador/i), 'zzz');
    expect(screen.getByText('Nenhuma pessoa encontrada com esse termo.')).toBeInTheDocument();

    cleanup();
    renderDialog({ data: { mode: 'create', users, fields, contexts: [] }, state: { isOpen: true, isLoadingUsers: true } });
    expect(screen.getByRole('button', { name: /Selecionar pessoa da lista/i })).toBeDisabled();
    expect(screen.getByText('Carregando lista de pessoas…')).toBeInTheDocument();
  });

  // feliz
  it('finds a person by id and keeps the typed e-mail when the directory has no name', async () => {
    renderDialog({
      data: {
        mode: 'create',
        users,
        fields: { userId: { value: 'usr_x', error: 'Escolha uma pessoa' }, userEmail: { value: 'x@empresa.com.br', error: null } },
        contexts: ['infra', 'sistema', 'manutencao'],
        contextsError: 'Escolha ao menos um módulo',
      },
    });
    expect(screen.getAllByText('x@empresa.com.br').length).toBeGreaterThan(0);
    expect(screen.getByText('Escolha uma pessoa')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha ao menos um módulo');
    expect(screen.getByRole('button', { name: 'Liberar 3 módulos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Alterar pessoa selecionada/i }));
    await userEvent.type(screen.getByPlaceholderText(/Buscar colaborador/i), 'usr_mar');
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /Infraestrutura/i })).toBeDisabled();
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
