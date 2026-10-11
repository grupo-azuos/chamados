<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import WhatsappLinkCard from './acerola-whatsapp-link-card.svelte';

  const actions = { onLink: fn(), onUnlink: fn() };

  const { Story } = defineMeta({
    title: 'Features/Profile/AcerolaWhatsappLinkCard',
    component: WhatsappLinkCard,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Sem número vinculado: o cartão oferece vincular. -->
<Story
  name="Default"
  args={{ data: { phone: '' }, state: { isConfigured: true, linkState: 'disconnected' }, actions }}
/>

<!-- Com número vinculado: mostra o número e oferece desvincular. -->
<Story
  name="Connected"
  args={{
    data: { phone: '+55 (62) 99999-0001' },
    state: { isConfigured: true, linkState: 'connected' },
    actions,
  }}
/>

<!-- Perto do limite do dia: o contador fica em tom de aviso. -->
<Story
  name="NearLimit"
  args={{
    data: { phone: '+55 (62) 99999-0001', sentToday: 74, dailyLimit: 100 },
    state: { isConfigured: true, linkState: 'connected' },
    actions,
  }}
/>

<!-- O super admin também edita os textos do bot. -->
<Story
  name="SuperAdmin"
  args={{
    data: { phone: '+55 (62) 99999-0001', sentToday: 8, dailyLimit: 100 },
    state: { isConfigured: true, linkState: 'connected' },
    actions: { ...actions, onEditTemplates: fn() },
  }}
/>

<!-- Vínculo começado e não terminado: o botão continua de onde parou. -->
<Story
  name="Pairing"
  args={{ data: { phone: '' }, state: { isConfigured: true, linkState: 'pairing' }, actions }}
/>

<Story
  name="Loading"
  args={{
    data: { phone: '' },
    state: { isLoading: true, isConfigured: false, linkState: 'disconnected' },
    actions,
  }}
/>

<!-- A instalação não tem o bot: o cartão explica e não oferece botão. -->
<Story
  name="NotConfigured"
  args={{ data: { phone: '' }, state: { isConfigured: false, linkState: 'disconnected' }, actions }}
/>

<!-- Caso limite: o serviço de WhatsApp não respondeu. -->
<Story
  name="WithError"
  args={{
    data: { phone: '' },
    state: {
      isConfigured: true,
      linkState: 'disconnected',
      error: 'Não consegui falar com o serviço de WhatsApp. Tente de novo em instantes.',
    },
    actions,
  }}
/>
