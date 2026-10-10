<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import WhatsappLinkDialog from './acerola-whatsapp-link-dialog.svelte';

  const actions = { onConfirm: fn(), onClose: fn() };

  /* Um quadrado cinza no lugar do QR code: a story não gera código de verdade. */
  const placeholderQr =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23cbd5e1"/></svg>';

  const { Story } = defineMeta({
    title: 'Profile/AcerolaWhatsappLinkDialog',
    component: WhatsappLinkDialog,
  });
</script>

<!-- O passo dos riscos, com o botão de confirmar ainda travado. -->
<Story
  name="Default"
  args={{ data: { qrImage: null }, state: { step: 'risks', secondsLeft: 10 }, actions }}
/>

<!-- A contagem acabou: o botão de confirmar libera. -->
<Story
  name="RisksReady"
  args={{ data: { qrImage: null }, state: { step: 'risks', secondsLeft: 0 }, actions }}
/>

<Story
  name="Linking"
  args={{
    data: { qrImage: null },
    state: { step: 'risks', secondsLeft: 0, isLinking: true },
    actions,
  }}
/>

<!-- A recusa aparece dentro do diálogo, e ele continua aberto. -->
<Story
  name="WithError"
  args={{
    data: { qrImage: null },
    state: {
      step: 'risks',
      secondsLeft: 0,
      error: 'Não consegui falar com o serviço de WhatsApp. Tente de novo em instantes.',
    },
    actions,
  }}
/>

<Story
  name="QrCode"
  args={{ data: { qrImage: placeholderQr }, state: { step: 'qr', secondsLeft: 0 }, actions }}
/>

<!-- Caso limite: o vínculo começou, mas o QR code ainda não chegou. -->
<Story
  name="QrCodeLoading"
  args={{ data: { qrImage: null }, state: { step: 'qr', secondsLeft: 0 }, actions }}
/>
