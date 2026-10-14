<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type WhatsappNotice } from '@template/shared/schemas/whatsapp-notice.schema';

  import WhatsappNoticeList from './acerola-whatsapp-notice-list.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaWhatsappNoticeList',
    component: WhatsappNoticeList,
  });

  const notice = (over: Partial<WhatsappNotice> = {}): WhatsappNotice => ({
    id: 1,
    kind: 'ticket_opened',
    status: 'sent',
    attempts: 1,
    failureReason: null,
    createdAt: '2026-10-14T12:00:00.000Z',
    sentAt: '2026-10-14T12:00:05.000Z',
    ...over,
  });

  const mixed = [
    notice({ id: 3, kind: 'ticket_ready', status: 'failed', failureReason: 'not_connected', attempts: 9, sentAt: null }),
    notice({ id: 2, kind: 'ticket_ready', status: 'pending', failureReason: 'failed', attempts: 2, sentAt: null }),
    notice(),
  ];

  const actions = { onRetry: () => {} };
</script>

<!-- O caso comum: o aviso de abertura saiu. -->
<Story name="Default" args={{ data: { notices: [notice()] }, actions }} />

<Story name="Every status" args={{ data: { notices: [
  ...mixed,
  notice({ id: 4, status: 'discarded', failureReason: 'limit_reached', sentAt: null }),
] }, actions }} />

<Story name="Queued" args={{ data: { notices: [notice({ status: 'pending', attempts: 0, sentAt: null })] } }} />

<Story name="Retrying one" args={{ data: { notices: mixed }, state: { retryingId: 3 }, actions }} />

<Story name="Retry failed" args={{ data: { notices: mixed }, state: { error: 'Este aviso não pode ser reenviado: ele está na fila ou já saiu.' }, actions }} />

<!-- Só leitura: sem a ação, o botão de reenviar não aparece. -->
<Story name="Read only" args={{ data: { notices: mixed } }} />

<!-- Caso limite: chamado sem aviso nenhum não desenha quadro vazio. -->
<Story name="Empty" args={{ data: { notices: [] } }} />
