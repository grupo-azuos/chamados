import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import MaintenanceFormDialog, {
  type MaintenanceFormField,
} from './azuos-maintenance-form-dialog.svelte';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

function fields(
  over: Partial<Record<MaintenanceFormField, FormFieldState>> = {},
): Record<MaintenanceFormField, FormFieldState> {
  return {
    computerId: field('3'),
    otherMachine: field(),
    type: field('preventive'),
    description: field(),
    performedBy: field(),
    performedAt: field('2026-09-20'),
    ...over,
  };
}

const machines = [
  { value: '3', label: 'Contábil — mesa do fechamento (CONTABIL-03)' },
  { value: '1', label: 'Recepção — balcão (RECEPCAO-01)' },
];

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('AzuosMaintenanceFormDialog', () => {
  // feliz
  it('asks what was done, on which machine and when', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByLabelText('Equipamento')).toBeInTheDocument();
    expect(screen.getByLabelText('O que foi feito')).toBeInTheDocument();
    /* A data virou o seletor do projeto (botão + calendário), não um campo de texto: o botão mostra
       o dia por extenso e o formulário recebe a data ISO no campo escondido. */
    expect(screen.getByRole('button', { name: 'Data do serviço' })).toHaveTextContent(
      '20 de set. de 2026',
    );
    expect(document.querySelector('input[name="performedAt"]')).toHaveValue('2026-09-20');
  });

  /* O campo de texto só existe quando nenhuma máquina foi escolhida: os dois juntos
     deixariam o registro dizendo duas coisas sobre o mesmo serviço. */
  it('offers the free-text equipment only when no machine is chosen', async () => {
    const { rerender } = render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.queryByLabelText('Qual equipamento')).not.toBeInTheDocument();

    await rerender({
      data: { mode: 'create', fields: fields({ computerId: field('') }), machines },
      state: { isOpen: true },
      actions,
    });

    expect(screen.getByLabelText('Qual equipamento')).toBeInTheDocument();
  });

  it('sends the form when it is submitted', async () => {
    const user = userEvent.setup();
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Registrar manutenção' }));

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  it('shows the field error right under the field', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: {
          mode: 'create',
          fields: fields({
            computerId: field(''),
            otherMachine: field('', 'Escolha a máquina na lista ou escreva o nome do equipamento'),
          }),
          machines,
        },
        state: { isOpen: true },
        actions,
      },
    });

    expect(
      screen.getByText('Escolha a máquina na lista ou escreva o nome do equipamento'),
    ).toBeInTheDocument();
  });

  /* A recusa do servidor aparece DENTRO do modal, que continua aberto com o que foi digitado. */
  it('keeps the form open and shows why the server refused', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: {
          mode: 'create',
          fields: fields({ description: field('Troca de SSD') }),
          machines,
        },
        state: { isOpen: true, error: 'A máquina escolhida não existe mais.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('A máquina escolhida não existe mais.');
    expect(screen.getByDisplayValue('Troca de SSD')).toBeInTheDocument();
  });

  it('says the machines are still loading instead of showing an empty list', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines: [] },
        state: { isOpen: true, isMachinesLoading: true },
        actions,
      },
    });

    expect(screen.getByText('Carregando as máquinas do inventário…')).toBeInTheDocument();
  });
});
/** Escolhe uma opção num seletor do projeto: pastilhas quando há poucas opções, lista com busca quando há muitas. */
async function choose(label: string, option: string) {
  const group = screen.queryByRole('group', { name: label });
  if (group) {
    await userEvent.click(within(group).getByRole('button', { name: option }));
    return;
  }
  await userEvent.click(screen.getByRole('button', { name: label }));
  const popup = await waitFor(() => {
    const open = [...document.querySelectorAll('[data-slot="popover-content"]')].at(-1);
    expect(open).toBeTruthy();
    return open as HTMLElement;
  });
  await fireEvent.click(within(popup).getByText(option, { exact: true }));
}

describe('AzuosMaintenanceFormDialog — every field reports to the model', () => {
  // feliz
  it('picks the machine and the type, types the texts and the date', async () => {
    vi.mocked(actions.onChange).mockClear();
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ computerId: field('') }), machines },
        state: { isOpen: true },
        actions,
      },
    });

    await choose('Equipamento', 'Recepção — balcão (RECEPCAO-01)');
    expect(actions.onChange).toHaveBeenCalledWith('computerId', '1');
    await choose('Tipo de manutenção', 'Limpeza');
    expect(actions.onChange).toHaveBeenCalledWith('type', 'cleaning');

    await userEvent.type(screen.getByRole('textbox', { name: /Qual equipamento/ }), 'I');
    await userEvent.tab();
    expect(actions.onChange).toHaveBeenCalledWith('otherMachine', expect.any(String));
    expect(actions.onBlur).toHaveBeenCalledWith('otherMachine');
    await userEvent.type(screen.getByRole('textbox', { name: /O que foi feito/ }), 'L');
    await userEvent.tab();
    expect(actions.onChange).toHaveBeenCalledWith('description', expect.any(String));
    expect(actions.onBlur).toHaveBeenCalledWith('description');
    await userEvent.type(screen.getByRole('textbox', { name: /Quem fez/ }), 'C');
    await userEvent.tab();
    expect(actions.onChange).toHaveBeenCalledWith('performedBy', expect.any(String));
    expect(actions.onBlur).toHaveBeenCalledWith('performedBy');

    await userEvent.click(screen.getByRole('button', { name: 'Data do serviço' }));
    const day = [...document.querySelectorAll('[data-bits-day]')].find((el) => el.textContent?.trim() === '15') as HTMLElement;
    await userEvent.click(day);
    expect(actions.onChange).toHaveBeenCalledWith('performedAt', expect.stringMatching(/-15$/));
    expect(actions.onBlur).toHaveBeenCalledWith('performedAt');
  });

  // triste
  it('shows the date error under the date', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ performedAt: field('', 'Informe a data') }), machines },
        state: { isOpen: true },
        actions,
      },
    });
    expect(screen.getByText('Informe a data')).toBeInTheDocument();
  });
});
