import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectFormDialog from './azuos-project-form-dialog.svelte';
import { type SoftwareProjectFormModel } from '$lib/hooks/use-software-project-form/use-software-project-form.svelte';

function createMockModel(overrides?: Partial<SoftwareProjectFormModel>): SoftwareProjectFormModel {
  return {
    data: {
      mode: 'create',
      fields: {
        name: { value: '', error: null },
        description: { value: '', error: null },
        repositoryUrl: { value: '', error: null },
        status: { value: 'active', error: null },
        color: { value: 'blue', error: null },
        responsibleId: { value: 'u-ana', error: null },
      },
      responsibleOptions: [
        { value: '', label: 'Sem responsável' },
        { value: 'u-ana', label: 'Ana Lima' },
      ],
      ...overrides?.data,
    },
    state: {
      isSubmitting: false,
      error: null,
      ...overrides?.state,
    },
    actions: {
      onChange: vi.fn(),
      onBlur: vi.fn(),
      onSubmit: vi.fn(),
      ...overrides?.actions,
    },
  };
}

describe('AzuosProjectFormDialog', () => {
  it('renders modal with title and fields when open', () => {
    const model = createMockModel();
    render(ProjectFormDialog, {
      props: {
        open: true,
        model,
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText('Novo Sistema')).toBeInTheDocument();
    expect(screen.getByText('Nome do sistema')).toBeInTheDocument();
    expect(screen.getByText('Repositório no GitHub')).toBeInTheDocument();
  });

  it('shows who answers for the system', () => {
    render(ProjectFormDialog, {
      props: { open: true, model: createMockModel(), onClose: vi.fn() },
    });

    expect(screen.getByText('Responsável')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('renders error message when model has state error', () => {
    const model = createMockModel({
      state: { isSubmitting: false, error: 'Falha ao salvar o sistema' },
    });
    render(ProjectFormDialog, {
      props: {
        open: true,
        model,
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText('Falha ao salvar o sistema')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const model = createMockModel();
    render(ProjectFormDialog, {
      props: {
        open: true,
        model,
        onClose,
      },
    });

    const closeBtn = screen.getByRole('button', { name: 'Fechar diálogo' });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AzuosProjectFormDialog — filling the form', () => {
  const pick = async (combobox: HTMLElement, option: string) => {
    await fireEvent.pointerDown(combobox);
    await fireEvent.click(combobox);
    await fireEvent.pointerUp(await screen.findByRole('option', { name: option }));
  };

  // feliz
  it('reports every field to the model and saves', async () => {
    const model = createMockModel();
    render(ProjectFormDialog, { props: { open: true, model, onClose: vi.fn() } });

    await userEvent.type(screen.getByRole('textbox', { name: /Nome do sistema/ }), 'P');
    await userEvent.tab();
    expect(model.actions.onChange).toHaveBeenCalledWith('name', 'P');
    expect(model.actions.onBlur).toHaveBeenCalledWith('name');

    await userEvent.type(screen.getByRole('textbox', { name: /Repositório no GitHub/ }), 'g');
    await userEvent.tab();
    expect(model.actions.onChange).toHaveBeenCalledWith('repositoryUrl', 'g');
    expect(model.actions.onBlur).toHaveBeenCalledWith('repositoryUrl');

    await userEvent.type(screen.getByRole('textbox', { name: 'Descrição' }), 'd');
    await userEvent.tab();
    expect(model.actions.onChange).toHaveBeenCalledWith('description', 'd');
    expect(model.actions.onBlur).toHaveBeenCalledWith('description');

    const [status, color] = screen.getAllByRole('combobox');
    await pick(status!, 'Manutenção');
    expect(model.actions.onChange).toHaveBeenCalledWith('status', 'maintenance');
    await pick(color!, 'Verde');
    expect(model.actions.onChange).toHaveBeenCalledWith('color', 'green');
    await pick(screen.getByRole('combobox', { name: 'Responsável pelo sistema' }), 'Sem responsável');
    expect(model.actions.onChange).toHaveBeenCalledWith('responsibleId', '');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(model.actions.onSubmit).toHaveBeenCalled();
  });

  // feliz
  it('submits the form with Enter and names the edit mode', async () => {
    const model = createMockModel({ data: { mode: 'edit' } as never });
    render(ProjectFormDialog, { props: { open: true, model, onClose: vi.fn() } });

    expect(screen.getByText('Editar Sistema')).toBeInTheDocument();
    await fireEvent.submit(screen.getByRole('textbox', { name: /Nome do sistema/ }).closest('form')!);
    expect(model.actions.onSubmit).toHaveBeenCalledOnce();
  });

  // triste
  it('closes through the cancel button', async () => {
    const onClose = vi.fn();
    render(ProjectFormDialog, { props: { open: true, model: createMockModel(), onClose } });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
