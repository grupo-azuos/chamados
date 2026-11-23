<!--
  @component
  Aproximar, afastar, enquadrar tudo e expandir — os botões da casa, e não os do Svelte Flow, no
  canto do próprio mapa.
-->
<script lang="ts">
  import Maximize from '@lucide/svelte/icons/maximize';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import { Panel, useSvelteFlow } from '@xyflow/svelte';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';

  let { actions }: { actions: { onExpand?: () => void } } = $props();

  const flow = useSvelteFlow();
</script>

<Panel position="top-right" class="flex gap-1">
  <ActionButton
    data={{ label: 'Aproximar' }}
    ui={{ variant: 'secondary', size: 'sm', icon: ZoomIn, isIconOnly: true }}
    actions={{ onClick: () => void flow.zoomIn() }}
  />
  <ActionButton
    data={{ label: 'Afastar' }}
    ui={{ variant: 'secondary', size: 'sm', icon: ZoomOut, isIconOnly: true }}
    actions={{ onClick: () => void flow.zoomOut() }}
  />
  <ActionButton
    data={{ label: 'Ver tudo' }}
    ui={{ variant: 'secondary', size: 'sm', icon: Maximize, isIconOnly: true }}
    actions={{ onClick: () => void flow.fitView() }}
  />
  {#if actions.onExpand}
    <ActionButton
      data={{ label: 'Expandir o mapa' }}
      ui={{ variant: 'secondary', size: 'sm', icon: Maximize2, isIconOnly: true }}
      actions={{ onClick: actions.onExpand }}
    />
  {/if}
</Panel>
