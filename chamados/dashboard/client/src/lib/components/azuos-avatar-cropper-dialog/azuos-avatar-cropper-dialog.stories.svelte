<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CropperDialog from './azuos-avatar-cropper-dialog.svelte';

  /* Uma "foto" desenhada em SVG: retrato 3:4, rosto acima do centro — o caso em que o quadrado
     central automático cortava a testa. */
  const PORTRAIT =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="%23e1e6f5"/><circle cx="300" cy="260" r="120" fill="%232e52b8"/><rect x="140" y="420" width="320" height="380" rx="160" fill="%232e52b8"/></svg>';

  const LANDSCAPE =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="%23142b69"/><circle cx="820" cy="260" r="140" fill="%23f5c518"/></svg>';

  const noop = () => undefined;
  const actions = { onConfirm: noop, onCancel: noop };

  const { Story } = defineMeta({
    title: 'Components/AzuosAvatarCropperDialog',
    component: CropperDialog,
  });
</script>

<Story name="Default" args={{ data: { imageUrl: PORTRAIT }, state: { isOpen: true }, actions }} />

<!-- Foto de celular deitada: é para isso que existem os botões de girar. -->
<Story name="Landscape" args={{ data: { imageUrl: LANDSCAPE }, state: { isOpen: true }, actions }} />

<!-- Enviando: nada fecha nem muda até terminar, para a pessoa não ficar sem saber se trocou. -->
<Story
  name="Saving"
  args={{ data: { imageUrl: PORTRAIT }, state: { isOpen: true, isSaving: true }, actions }}
/>

<!-- A falha do envio fica dentro do editor, com o motivo, e a pessoa pode tentar de novo. -->
<Story
  name="UploadFailed"
  args={{
    data: { imageUrl: PORTRAIT },
    state: { isOpen: true, error: 'Não consegui salvar a foto agora. Tente de novo em instantes.' },
    actions,
  }}
/>

<Story name="Closed" args={{ data: { imageUrl: PORTRAIT }, state: { isOpen: false }, actions }} />
