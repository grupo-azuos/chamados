import { onDestroy } from 'svelte';

import { readError } from '$lib/api/http-client';
import { type AvatarCropSelection } from '$lib/components/azuos-avatar-cropper-dialog/azuos-avatar-cropper-dialog.svelte';
import {
  assertIsImageFile,
  AvatarImageError,
  toCroppedAvatarUpload,
  type UploadAvatarInput,
} from '$lib/utils/avatar-image.util';

type PendingImage = { file: File; url: string };

/**
 * ESCOLHER, AJUSTAR E ENVIAR A FOTO — o ciclo do editor, fora da tela. Trazido do admin-console
 * (`use-avatar-editor.model.ts`).
 *
 * Escolher o arquivo não envia nada: abre o editor com a imagem. Só "Usar esta foto" corta, reduz
 * e envia. O arquivo nunca sai do navegador inteiro — o que vai é o recorte, já com 256px.
 *
 * O ENVIO é de quem chama (`upload`): a foto de perfil é guardada pelo admin-console, e o
 * Chamados não tem rota própria para ela. Este model só prepara a imagem e cuida do editor.
 *
 * A imagem é mostrada por um `blob:` URL, e todo `blob:` criado aqui é revogado: ao cancelar, ao
 * terminar o envio, ao trocar de imagem e ao sair da tela. Esquecer um é segurar a foto inteira
 * na memória até a aba fechar.
 */
export function useAvatarEditorModel(options: {
  upload: (input: UploadAvatarInput) => Promise<string | null>;
  onUploaded?: () => Promise<void> | void;
}) {
  let pending = $state<PendingImage | null>(null);
  let pickError = $state<string | null>(null);
  let uploadError = $state<unknown>(null);
  let isUploading = $state(false);
  let uploadedAvatarUrl = $state<string | null>(null);
  let isUploaded = $state(false);

  function replacePending(next: PendingImage | null): void {
    if (pending) URL.revokeObjectURL(pending.url);
    pending = next;
  }

  function resetUpload(): void {
    uploadError = null;
    isUploaded = false;
  }

  onDestroy(() => {
    if (pending) URL.revokeObjectURL(pending.url);
  });

  async function confirmCrop(selection: AvatarCropSelection): Promise<void> {
    if (!pending || isUploading) return;

    isUploading = true;
    uploadError = null;
    try {
      uploadedAvatarUrl = await options.upload(
        await toCroppedAvatarUpload(pending.file, selection),
      );
      isUploaded = true;
      replacePending(null);
      await options.onUploaded?.();
    } catch (error) {
      uploadError = error;
    } finally {
      isUploading = false;
    }
  }

  return {
    get data() {
      return { cropImageUrl: pending?.url ?? null, uploadedAvatarUrl };
    },
    get state() {
      return {
        isCropOpen: pending !== null,
        isUploading,
        isUploaded,
        /* O erro de escolher o arquivo aparece no cartão; o de enviar, dentro do editor aberto. */
        pickError,
        cropError: pending ? uploadErrorMessage(uploadError) : null,
      };
    },
    actions: {
      onPickFile: (file: File) => {
        resetUpload();
        const failure = validateImage(file);
        pickError = failure;
        if (failure) return;

        replacePending({ file, url: URL.createObjectURL(file) });
      },
      onConfirmCrop: (selection: AvatarCropSelection) => void confirmCrop(selection),
      onCancelCrop: () => {
        if (isUploading) return;
        resetUpload();
        replacePending(null);
      },
      reset: () => {
        resetUpload();
        pickError = null;
      },
    },
  };
}

export type AvatarEditorModel = ReturnType<typeof useAvatarEditorModel>;

/** A mensagem do arquivo recusado, ou `null` quando ele pode ir para o editor. */
export function validateImage(file: { type: string }): string | null {
  try {
    assertIsImageFile(file);

    return null;
  } catch (error) {
    if (error instanceof AvatarImageError) return error.message;

    throw error;
  }
}

/** A falha de preparar a imagem tem texto próprio; a do envio vem do servidor. */
function uploadErrorMessage(error: unknown): string | null {
  if (error instanceof AvatarImageError) return error.message;

  return readError(error);
}
