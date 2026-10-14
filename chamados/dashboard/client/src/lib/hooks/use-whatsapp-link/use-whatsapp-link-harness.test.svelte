<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useWhatsappLinkModel } from './use-whatsapp-link.svelte';

  type WhatsappLinkModel = ReturnType<typeof useWhatsappLinkModel>;

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { onReady }: { onReady: (model: WhatsappLinkModel) => void } = $props();

  setQueryClientContext(
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }),
  );

  onReady(useWhatsappLinkModel('user-1'));
</script>
