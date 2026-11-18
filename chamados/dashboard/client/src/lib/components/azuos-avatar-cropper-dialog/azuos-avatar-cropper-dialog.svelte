<script lang="ts" module>
  /**
   * O EDITOR DA FOTO DE PERFIL — cortar, aproximar e girar antes de enviar. Trazido do
   * admin-console (`AzuosAvatarCropperDialog`), com o mesmo visual, textos e limites.
   *
   * O recorte em si é do `svelte-easy-crop` (arrastar, pinça no celular, roda do mouse); o modal
   * é do shadcn-svelte e o zoom, o `AzuosSliderField`. Este componente só os junta e devolve a
   * escolha: a área em pixels e a rotação. Quem transforma isso em imagem é o model — a tela não
   * lê arquivo.
   *
   * Uma diferença do React: o `svelte-easy-crop` não gira. A imagem girada é preparada à parte
   * (`rotateImageUrl`) e é ELA que vai para o recorte — a área medida fica no referencial da
   * imagem girada, igual ao `react-easy-crop`.
   *
   * Posição, zoom e rotação são estado PURAMENTE visual enquanto a pessoa ajusta. Só o "Usar esta
   * foto" os entrega para fora.
   */
  export type AvatarCropSelection = {
    area: { x: number; y: number; width: number; height: number };
    rotation: number;
  };

  export type AzuosAvatarCropperDialogProps = {
    data: { imageUrl: string | null };
    state?: { isOpen?: boolean; isSaving?: boolean; error?: string | null };
    actions: {
      onConfirm: (selection: AvatarCropSelection) => void;
      onCancel: () => void;
    };
  };

  export const MIN_ZOOM = 1;
  export const MAX_ZOOM = 4;

  /** Sempre entre 0 e 359: girar quatro vezes volta ao começo, e não para 360 ou -90. */
  export function normalizeRotation(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
  }
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import Cropper, { type CropArea } from 'svelte-easy-crop';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import SliderField from '$lib/components/azuos-slider-field/azuos-slider-field.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import { rotateImageUrl } from '$lib/utils/avatar-image.util';

  /* `state` vira `status` aqui dentro: com uma variável chamada `state`, o Svelte lê `$state(...)`
     como a assinatura de um store, e não como a runa. */
  let { data, state: status, actions }: AzuosAvatarCropperDialogProps = $props();

  const isSaving = $derived(Boolean(status?.isSaving));

  let crop = $state({ x: 0, y: 0 });
  let zoom = $state(MIN_ZOOM);
  let rotation = $state(0);
  let area = $state<CropArea | null>(null);
  let rotatedUrl = $state<string | null>(null);

  /* A cada imagem nova o ajuste recomeça: zoom e posição da foto anterior não servem para a
     próxima (no React, era a `key` do editor). */
  $effect.pre(() => {
    void data.imageUrl;
    crop = { x: 0, y: 0 };
    zoom = MIN_ZOOM;
    rotation = 0;
    area = null;
  });

  /* A imagem girada é um `blob:` próprio: revogado ao girar de novo, ao trocar de imagem e ao
     fechar — esquecer um é segurar a foto inteira na memória até a aba fechar. */
  $effect(() => {
    const source = data.imageUrl;
    const degrees = rotation;
    rotatedUrl = null;
    if (!source || degrees === 0) return;

    let created: string | null = null;
    let isCurrent = true;
    rotateImageUrl(source, degrees)
      .then((url) => {
        created = url;
        if (isCurrent) rotatedUrl = url;
        else URL.revokeObjectURL(url);
      })
      /* Sem canvas (navegador antigo, teste) a foto fica como veio: girar é ajuda, não trava. */
      .catch(() => undefined);

    return () => {
      isCurrent = false;
      if (created) URL.revokeObjectURL(created);
    };
  });

  const editorImage = $derived(rotation === 0 ? data.imageUrl : rotatedUrl);

  function rotate(step: number): void {
    rotation = normalizeRotation(rotation + step);
    crop = { x: 0, y: 0 };
    area = null;
  }

  function confirm(): void {
    if (area) actions.onConfirm({ area, rotation });
  }
</script>

<Dialog
  open={Boolean(status?.isOpen && data.imageUrl)}
  onOpenChange={(isOpen: boolean) => {
    /* Fechar no meio do envio deixaria a pessoa sem saber se a foto trocou. */
    if (!isOpen && !isSaving) actions.onCancel();
  }}
>
  <!-- Sem altura máxima, deitado no celular (≈380px de altura) o recorte, o zoom e os dois
       botões não cabiam, e o que sobrava ficava fora da tela SEM rolagem. `svh` porque `vh`
       desconta a barra de endereço escondida. -->
  <DialogContent
    class="max-h-[calc(100svh-2rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6"
    showCloseButton={!isSaving}
  >
    <DialogHeader>
      <DialogTitle>Ajustar foto</DialogTitle>
      <DialogDescription>
        Arraste para posicionar e use o zoom para enquadrar o rosto no círculo.
      </DialogDescription>
    </DialogHeader>

    {#if data.imageUrl}
      <div class="flex flex-col gap-4">
        <!-- Mais baixo no celular: 288px de recorte mais o cabeçalho, o zoom e os botões não
             cabem numa tela de 640px de altura sem empurrar "Usar esta foto" para fora. -->
        <div class="bg-backdrop rounded-box relative h-56 w-full overflow-hidden sm:h-72">
          {#if editorImage}
            {#key editorImage}
              <Cropper
                image={editorImage}
                bind:crop
                bind:zoom
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={1}
                cropShape="round"
                showGrid={false}
                oncropcomplete={(event) => (area = event.pixels)}
              />
            {/key}
          {/if}
        </div>

        <SliderField
          data={{ label: 'Zoom', value: zoom, min: MIN_ZOOM, max: MAX_ZOOM, step: 0.05 }}
          state={{ isDisabled: isSaving }}
          actions={{ onChange: (value) => (zoom = value) }}
        >
          {#snippet startIcon()}
            <ZoomOut class="text-ink-500 size-4 shrink-0" aria-hidden="true" />
          {/snippet}
          {#snippet endIcon()}
            <ZoomIn class="text-ink-500 size-4 shrink-0" aria-hidden="true" />
          {/snippet}
        </SliderField>

        <div class="flex justify-center gap-2">
          <ActionButton
            data={{ label: 'Girar para a esquerda' }}
            ui={{ icon: RotateCcw, variant: 'secondary', size: 'lg' }}
            state={{ isDisabled: isSaving }}
            actions={{ onClick: () => rotate(-90) }}
          />
          <ActionButton
            data={{ label: 'Girar para a direita' }}
            ui={{ icon: RotateCw, variant: 'secondary', size: 'lg' }}
            state={{ isDisabled: isSaving }}
            actions={{ onClick: () => rotate(90) }}
          />
        </div>

        {#if status?.error}
          <ErrorState data={{ message: status.error }} ui={{ variant: 'inline' }} />
        {/if}

        <DialogFooter>
          <ActionButton
            data={{ label: 'Cancelar' }}
            ui={{ variant: 'secondary' }}
            state={{ isDisabled: isSaving }}
            actions={{ onClick: actions.onCancel }}
          />
          <!-- Sem área medida ainda (a imagem não terminou de carregar) não há o que cortar. -->
          <ActionButton
            data={{ label: 'Usar esta foto', loadingLabel: 'Enviando…' }}
            ui={{ icon: Check, variant: 'primary' }}
            state={{ isLoading: isSaving, isDisabled: area === null }}
            actions={{ onClick: confirm }}
          />
        </DialogFooter>
      </div>
    {/if}
  </DialogContent>
</Dialog>
