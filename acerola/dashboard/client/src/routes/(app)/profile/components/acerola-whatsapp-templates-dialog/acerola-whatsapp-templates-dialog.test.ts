import { type WhatsappTemplate } from '@template/shared/schemas/whatsapp-template.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WhatsappTemplatesDialog, {
  type AcerolaWhatsappTemplatesDialogProps,
} from './acerola-whatsapp-templates-dialog.svelte';

const ready: WhatsappTemplate = {
  key: 'ticket_ready',
  label: 'Chamado pronto',
  description: 'Enviada quando o chamado fica pronto.',
  variables: ['nome', 'protocolo'],
  body: 'Olá, {{nome}}!',
  defaultBody: 'Olá, {{nome}}!',
  isCustomized: false,
};

function renderDialog(
  state: Partial<AcerolaWhatsappTemplatesDialogProps['state']> = {},
  data: Partial<AcerolaWhatsappTemplatesDialogProps['data']> = {},
) {
  const actions = {
    onSelect: vi.fn(),
    onDraftChange: vi.fn(),
    onSave: vi.fn(),
    onRestore: vi.fn(),
    onClose: vi.fn(),
  };

  render(WhatsappTemplatesDialog, {
    props: {
      data: {
        templates: [ready],
        selected: ready,
        draft: 'Olá, {{nome}}!',
        preview: 'Olá, Bia Costa!',
        ...data,
      },
      state: { isOpen: true, ...state },
      actions,
    },
  });

  return actions;
}

describe('AcerolaWhatsappTemplatesDialog', () => {
  // feliz
  it('shows the text, when it is sent, and how it looks with a sample ticket', () => {
    renderDialog();

    expect(screen.getByRole('textbox')).toHaveValue('Olá, {{nome}}!');
    expect(screen.getByText('Enviada quando o chamado fica pronto.')).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-template-preview')).toHaveTextContent('Olá, Bia Costa!');
  });

  it('adds a variable of the message to the end of the text on a click', async () => {
    const actions = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Inserir a variável protocolo' }));

    expect(actions.onDraftChange).toHaveBeenCalledWith('Olá, {{nome}}! {{protocolo}}');
  });

  it('saves when there is something valid to save', async () => {
    const actions = renderDialog({ canSave: true });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar texto' }));

    expect(actions.onSave).toHaveBeenCalledOnce();
  });

  it('offers to restore the original only for a text that was edited', async () => {
    const actions = renderDialog({}, { selected: { ...ready, isCustomized: true } });

    await userEvent.click(screen.getByRole('button', { name: 'Restaurar o original' }));

    expect(actions.onRestore).toHaveBeenCalledOnce();
  });

  // triste
  /* Variável que não existe sairia crua numa mensagem de verdade: salvar fica travado. */
  it('shows why the text cannot be saved and keeps the save button locked', async () => {
    const actions = renderDialog({
      canSave: false,
      draftError: 'Estas variáveis não existem para esta mensagem: {{var}}',
    });

    expect(screen.getByText(/não existem para esta mensagem/)).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Salvar texto' });
    expect(save).toBeDisabled();
    await userEvent.click(save);

    expect(actions.onSave).not.toHaveBeenCalled();
  });

  it('hides the restore button for a text that is still the original', () => {
    renderDialog();

    expect(screen.queryByRole('button', { name: 'Restaurar o original' })).not.toBeInTheDocument();
  });

  it('says so while the texts are loading', () => {
    renderDialog({ isLoading: true }, { templates: [], selected: null });

    expect(screen.getByRole('status')).toHaveTextContent('Carregando os textos…');
  });

  it('shows the refusal of the server when the list could not be loaded', () => {
    renderDialog(
      { error: 'Só o super admin vê e edita os textos.' },
      { templates: [], selected: null },
    );

    expect(screen.getByText('Só o super admin vê e edita os textos.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('draws nothing when closed', () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
