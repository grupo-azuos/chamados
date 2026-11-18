import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
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

describe('AzuosAvatarCropperDialog — rotating, zooming and closing', () => {
  // feliz
  it('rotates the photo through a rotated copy and frees the previous one', async () => {
    const util = await import('$lib/utils/avatar-image.util');
    const spy = vi.spyOn(util, 'rotateImageUrl').mockResolvedValue('blob:http://localhost/girada');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: revoke }));
    try {
      renderDialog({ isOpen: true });

      await userEvent.click(screen.getByRole('button', { name: 'Girar para a direita' }));
      await waitFor(() => expect(spy).toHaveBeenCalledWith(IMAGE, 90));
      await userEvent.click(screen.getByRole('button', { name: 'Girar para a esquerda' }));
      await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:http://localhost/girada'));
    } finally {
      vi.unstubAllGlobals();
      spy.mockRestore();
    }
  });

  // feliz
  it('changes the zoom from the slider', async () => {
    renderDialog({ isOpen: true });
    const slider = screen.getByRole('slider', { name: 'Zoom' });
    await userEvent.click(slider);
    await userEvent.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow');
  });

  // triste
  it('does not let Escape close the editor while the photo is being sent', async () => {
    const actions = renderDialog({ isOpen: true, isSaving: true });
    await userEvent.keyboard('{Escape}');
    expect(actions.onCancel).not.toHaveBeenCalled();

    cleanup();
    const idle = renderDialog({ isOpen: true });
    await userEvent.keyboard('{Escape}');
    expect(idle.onCancel).toHaveBeenCalled();
  });
});

describe('AzuosAvatarCropperDialog — without a photo yet', () => {
  // triste
  it('shows no editor while there is no image to crop', () => {
    render(CropperDialog, {
      props: { data: { imageUrl: null }, state: { isOpen: true }, actions: { onConfirm: vi.fn(), onCancel: vi.fn() } },
    });

    expect(screen.queryByRole('button', { name: 'Girar para a direita' })).not.toBeInTheDocument();
  });
});

describe('AzuosAvatarCropperDialog — rotations that overlap', () => {
  // triste
  /* Girou de novo antes da primeira cópia ficar pronta: a cópia atrasada é descartada, e a que
     ficou é liberada quando o diálogo fecha. */
  it('frees a rotated copy that arrived late, and the last one on unmount', async () => {
    const util = await import('$lib/utils/avatar-image.util');
    let finishFirst!: (url: string) => void;
    let finishSecond!: (url: string) => void;
    const spy = vi
      .spyOn(util, 'rotateImageUrl')
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; }));
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: revoke }));
    try {
      const { unmount } = render(CropperDialog, {
        props: { data: { imageUrl: IMAGE }, state: { isOpen: true }, actions: { onConfirm: vi.fn(), onCancel: vi.fn() } },
      });

      await userEvent.click(screen.getByRole('button', { name: 'Girar para a direita' }));
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
      await userEvent.click(screen.getByRole('button', { name: 'Girar para a direita' }));
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

      finishFirst('blob:http://localhost/atrasada');
      await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:http://localhost/atrasada'));

      finishSecond('blob:http://localhost/atual');
      await waitFor(() => expect(revoke).toHaveBeenCalledTimes(1));
      unmount();
      expect(revoke).toHaveBeenCalledWith('blob:http://localhost/atual');
    } finally {
      vi.unstubAllGlobals();
      spy.mockRestore();
    }
  });
});
