import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import QuoteFormDialog, {
  type AzuosQuoteFormDialogProps,
  type QuoteFormField,
} from './azuos-quote-form-dialog.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

const fields: Record<QuoteFormField, FormFieldState> = {
  supplier: field('Clima Norte Refrigeração'),
  description: field('Limpeza e recarga de gás'),
  kind: field('service'),
  amount: field('960,00'),
  quotedOn: field('2026-10-02'),
  status: field('pending'),
  note: field(''),
};

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onAttachmentChange: vi.fn(),
  onAttachmentRemove: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

function setup(overrides: Partial<AzuosQuoteFormDialogProps> = {}) {
  return render(QuoteFormDialog, {
    props: {
      data: { mode: 'create', fields, attachment: { name: null } },
      state: { isOpen: true },
      actions,
      ...overrides,
    } as AzuosQuoteFormDialogProps,
  });
}

describe('AzuosQuoteFormDialog', () => {
  // feliz
  it('shows the quote fields with their values', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Guardar orçamento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa')).toHaveValue('Clima Norte Refrigeração');
    expect(screen.getByLabelText('O que foi orçado')).toHaveValue('Limpeza e recarga de gás');
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('960,00');
  });

  it('reports what the person typed', async () => {
    const onChange = vi.fn();
    setup({ actions: { ...actions, onChange } });

    await userEvent.type(screen.getByLabelText('Empresa'), 'X');

    expect(onChange).toHaveBeenCalledWith('supplier', 'Clima Norte RefrigeraçãoX');
  });

  it('asks to save when the form is submitted', async () => {
    const onSubmit = vi.fn();
    setup({ actions: { ...actions, onSubmit } });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar orçamento' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('reports the document that was attached', async () => {
    const onAttachmentChange = vi.fn();
    setup({ actions: { ...actions, onAttachmentChange } });
    const pdf = new File(['x'], 'orcamento.pdf', { type: 'application/pdf' });

    await userEvent.upload(document.querySelector<HTMLInputElement>('#attachment')!, pdf);

    expect(onAttachmentChange).toHaveBeenCalledWith(pdf);
  });

  it('shows the document that is there and lets it be dropped', async () => {
    const onAttachmentRemove = vi.fn();
    setup({
      data: { mode: 'edit', fields, attachment: { name: 'orcamento-clima-norte.pdf' } },
      actions: { ...actions, onAttachmentRemove },
    });

    expect(screen.getByRole('heading', { name: 'Corrigir orçamento' })).toBeInTheDocument();
    expect(screen.getByText('orcamento-clima-norte.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar documento' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover documento' }));

    expect(onAttachmentRemove).toHaveBeenCalledOnce();
  });

  // triste
  it('shows the error of a field next to it', () => {
    setup({
      data: {
        mode: 'create',
        fields: {
          ...fields,
          amount: field('a combinar', 'Informe o valor em reais, como 1.250,00'),
        },
        attachment: { name: null },
      },
    });

    expect(screen.getByText('Informe o valor em reais, como 1.250,00')).toBeInTheDocument();
  });

  /* O erro do documento é dele: o que foi digitado continua na tela. */
  it('shows the refusal of the document without touching the other fields', () => {
    setup({ state: { isOpen: true, attachmentError: 'O documento precisa ser um PDF.' } });

    expect(screen.getByText('O documento precisa ser um PDF.')).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa')).toHaveValue('Clima Norte Refrigeração');
  });

  it('shows the failure of the save with its reason', () => {
    setup({ state: { isOpen: true, error: 'Seu cargo em Manutenção só permite consultar.' } });

    expect(screen.getByText('Seu cargo em Manutenção só permite consultar.')).toBeInTheDocument();
  });

  it('locks the form while saving', () => {
    setup({ state: { isOpen: true, isSubmitting: true } });

    expect(screen.getByLabelText('Empresa')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anexar documento' })).toBeDisabled();
  });

  /* Sem documento não existe o botão de remover: botão que não faz nada é ruído. */
  it('offers no way to drop a document that does not exist (edge case)', () => {
    setup();

    expect(screen.queryByRole('button', { name: 'Remover documento' })).toBeNull();
  });
});


/** Escolhe a segunda opção de um seletor, seja ele de pastilhas ou de lista com busca. */
async function chooseSecond(label: string) {
  const group = screen.queryByRole('group', { name: label });
  if (group) {
    await userEvent.click(within(group).getAllByRole('button')[1]!);
    return;
  }
  await userEvent.click(screen.getByRole('button', { name: label }));
  const popup = await waitFor(() => {
    const open = [...document.querySelectorAll('[data-slot="popover-content"]')].at(-1);
    expect(open).toBeTruthy();
    return open as HTMLElement;
  });
  await fireEvent.click(within(popup).getAllByRole('button', { hidden: true })[1]!);
}

describe('AzuosQuoteFormDialog — every field reports to the model', () => {
  // feliz
  it('types the texts, picks the kind, the status and the date, and attaches a document', async () => {
    vi.mocked(actions.onChange).mockClear();
    setup();

    await userEvent.type(screen.getByRole('textbox', { name: /O que foi orçado/ }), '!');
    await userEvent.tab();
    expect(actions.onChange).toHaveBeenCalledWith('description', expect.any(String));
    expect(actions.onBlur).toHaveBeenCalledWith('description');
    await userEvent.type(screen.getByRole('textbox', { name: /Valor/ }), '1');
    await userEvent.tab();
    expect(actions.onChange).toHaveBeenCalledWith('amount', expect.any(String));
    expect(actions.onBlur).toHaveBeenCalledWith('amount');
    await userEvent.type(screen.getByRole('textbox', { name: /Observação/ }), 'x');
    await userEvent.tab();
    expect(actions.onChange).toHaveBeenCalledWith('note', 'x');
    expect(actions.onBlur).toHaveBeenCalledWith('note');

    await chooseSecond('Tipo do orçamento');
    expect(actions.onChange).toHaveBeenCalledWith('kind', expect.any(String));
    await chooseSecond('Situação do orçamento');
    expect(actions.onChange).toHaveBeenCalledWith('status', expect.any(String));

    await userEvent.click(screen.getByRole('button', { name: 'Data do orçamento' }));
    const day = [...document.querySelectorAll('[data-bits-day]')].find((el) => el.textContent?.trim() === '15') as HTMLElement;
    await userEvent.click(day);
    expect(actions.onChange).toHaveBeenCalledWith('quotedOn', expect.stringMatching(/^\d{4}-\d{2}-15$/));
    expect(actions.onBlur).toHaveBeenCalledWith('quotedOn');

    await userEvent.click(screen.getByRole('button', { name: 'Anexar documento' }));
  });

  // triste
  it('closes with Escape and shows the date error', async () => {
    vi.mocked(actions.onClose).mockClear();
    setup({ data: { mode: 'create', fields: { ...fields, quotedOn: field('', 'Informe a data') }, attachment: { name: null } } } as never);
    expect(screen.getByText('Informe a data')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(actions.onClose).toHaveBeenCalled();
  });
});
