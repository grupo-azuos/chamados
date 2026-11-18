import { render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as avatarImage from '$lib/utils/avatar-image.util';
import { AvatarImageError, toCroppedAvatarUpload } from '$lib/utils/avatar-image.util';
import Harness from './use-avatar-editor-harness.test.svelte';
import { type AvatarEditorModel, validateImage } from './use-avatar-editor.svelte';

/* O canvas não existe no jsdom: o recorte de verdade é provado pelas contas de `avatar-image`. */
vi.mock('$lib/utils/avatar-image.util', async (importOriginal) => ({
  ...(await importOriginal<typeof avatarImage>()),
  toCroppedAvatarUpload: vi.fn(),
}));

const SELECTION = { area: { x: 10, y: 20, width: 300, height: 300 }, rotation: 90 };
const CROPPED = { contentType: 'image/webp' as const, data: 'UklGRg==' };

function photo(type = 'image/jpeg') {
  return new File(['x'], 'foto.jpg', { type });
}

function mountModel(
  upload = vi.fn().mockResolvedValue('https://login.local/api/users/u/avatar?v=2'),
  onUploaded = vi.fn(),
): AvatarEditorModel {
  let model!: AvatarEditorModel;
  render(Harness, {
    props: { upload, onUploaded, onReady: (ready: AvatarEditorModel) => (model = ready) },
  });

  return model;
}

let created = 0;

beforeEach(() => {
  created = 0;
  URL.createObjectURL = vi.fn(() => `blob:http://localhost/${(created += 1)}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAvatarEditorModel', () => {
  // feliz
  it('opens the editor with the chosen image instead of uploading right away', () => {
    const upload = vi.fn();
    const model = mountModel(upload);

    model.actions.onPickFile(photo());

    expect(model.state.isCropOpen).toBe(true);
    expect(model.data.cropImageUrl).toBe('blob:http://localhost/1');
    expect(upload).not.toHaveBeenCalled();
  });

  it('crops with the chosen selection, uploads, closes and refreshes', async () => {
    vi.mocked(toCroppedAvatarUpload).mockResolvedValue(CROPPED);
    const upload = vi.fn().mockResolvedValue('https://login.local/api/users/u/avatar?v=2');
    const onUploaded = vi.fn();
    const model = mountModel(upload, onUploaded);
    const file = photo();

    model.actions.onPickFile(file);
    model.actions.onConfirmCrop(SELECTION);
    await waitFor(() => expect(model.state.isUploaded).toBe(true));

    expect(toCroppedAvatarUpload).toHaveBeenCalledWith(file, SELECTION);
    expect(upload).toHaveBeenCalledWith(CROPPED);
    expect(onUploaded).toHaveBeenCalled();
    expect(model.state.isCropOpen).toBe(false);
    expect(model.data.uploadedAvatarUrl).toMatch(/v=2$/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/1');
  });

  // triste
  it('refuses a file that is not an image, without opening the editor', () => {
    const model = mountModel();

    model.actions.onPickFile(photo('application/pdf'));

    expect(model.state.isCropOpen).toBe(false);
    expect(model.state.pickError).toMatch(/arquivo de imagem/);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  /* Um `blob:` esquecido segura a foto inteira na memória até a aba fechar. */
  it('releases the image when the person cancels', () => {
    const model = mountModel();

    model.actions.onPickFile(photo());
    model.actions.onCancelCrop();

    expect(model.state.isCropOpen).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/1');
  });

  it('releases the previous image when another one is picked', () => {
    const model = mountModel();

    model.actions.onPickFile(photo());
    model.actions.onPickFile(photo());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/1');
    expect(model.data.cropImageUrl).toBe('blob:http://localhost/2');
  });

  it('keeps the editor open with the reason when the image cannot be prepared', async () => {
    vi.mocked(toCroppedAvatarUpload).mockRejectedValue(
      new AvatarImageError('A foto ficou maior que 1 MB mesmo reduzida.'),
    );
    const model = mountModel();

    model.actions.onPickFile(photo());
    model.actions.onConfirmCrop(SELECTION);
    await waitFor(() => expect(model.state.cropError).not.toBeNull());

    expect(model.state.isCropOpen).toBe(true);
    expect(model.state.cropError).toMatch(/1 MB/);
  });

  it('keeps the editor open when the upload itself fails', async () => {
    vi.mocked(toCroppedAvatarUpload).mockResolvedValue(CROPPED);
    const model = mountModel(vi.fn().mockRejectedValue(new Error('offline')));

    model.actions.onPickFile(photo());
    model.actions.onConfirmCrop(SELECTION);
    await waitFor(() => expect(model.state.cropError).not.toBeNull());

    expect(model.state.isCropOpen).toBe(true);
    expect(model.state.isUploading).toBe(false);
  });
});

describe('validateImage', () => {
  // feliz
  it('accepts an image', () => {
    expect(validateImage({ type: 'image/png' })).toBeNull();
  });

  // triste
  it('explains the refusal of anything else', () => {
    expect(validateImage({ type: 'text/html' })).toMatch(/PNG, JPEG ou WebP/);
  });
});
