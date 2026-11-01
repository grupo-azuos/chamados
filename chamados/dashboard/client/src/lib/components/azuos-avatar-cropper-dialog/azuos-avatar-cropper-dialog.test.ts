import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CropperDialog, { normalizeRotation } from './azuos-avatar-cropper-dialog.svelte';

const IMAGE = 'blob:http://localhost/foto';

function renderDialog(state: { isOpen?: boolean; isSaving?: boolean; error?: string | null }) {
  const actions = { onConfirm: vi.fn(), onCancel: vi.fn() };

  render(CropperDialog, { props: { data: { imageUrl: IMAGE }, state, actions } });

  return actions;
}

describe('AzuosAvatarCropperDialog', () => {
  // feliz
  it('opens the editor with the zoom and rotation controls', () => {
    renderDialog({ isOpen: true });

    expect(screen.getByRole('dialog', { name: 'Ajustar foto' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Zoom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Girar para a direita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Girar para a esquerda' })).toBeInTheDocument();
  });

  it('cancels without sending anything', async () => {
    const actions = renderDialog({ isOpen: true });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(actions.onCancel).toHaveBeenCalled();
    expect(actions.onConfirm).not.toHaveBeenCalled();
  });

  // triste
  /* Antes de a imagem ser medida não existe área escolhida — confirmar mandaria um corte vazio. */
  it('does not confirm before the image has been measured', async () => {
    const actions = renderDialog({ isOpen: true });

    const confirm = screen.getByRole('button', { name: /Usar esta foto/ });
    await userEvent.click(confirm);

    expect(confirm).toBeDisabled();
    expect(actions.onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the upload failure inside the editor', () => {
    renderDialog({ isOpen: true, error: 'Não consegui salvar a foto agora.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui salvar a foto agora.');
  });

  /* Enviando, nada muda: girar ou cancelar no meio deixaria a pessoa sem saber o que foi. */
  it('locks the controls while saving', () => {
    renderDialog({ isOpen: true, isSaving: true });

    expect(screen.getByRole('button', { name: 'Girar para a direita' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('normalizeRotation', () => {
  // feliz
  it('keeps the rotation between 0 and 359', () => {
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
  });
});
