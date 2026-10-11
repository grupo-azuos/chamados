<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useWhatsappTemplatesModel } from './use-whatsapp-templates.svelte';

  type WhatsappTemplatesModel = ReturnType<typeof useWhatsappTemplatesModel>;

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { onReady }: { onReady: (model: WhatsappTemplatesModel) => void } = $props();

  setQueryClientContext(
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }),
  );

  onReady(useWhatsappTemplatesModel());
</script>
