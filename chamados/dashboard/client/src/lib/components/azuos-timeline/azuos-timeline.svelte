<!--
  @component
  Casca de uma lista de etapas (usar com `AzuosTimelineStep`).

  Troca "um monte de campo solto" por uma narrativa: cada etapa aparece na ordem em que acontece,
  com um ícone e uma linha ligando à próxima — como o histórico de um chamado, não como um
  formulário de cadastro.

  Recebe só `ui.className` e as etapas em `children`.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosTimelineProps = {
    ui?: { className?: string };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { ui, children }: AzuosTimelineProps = $props();
</script>

<div class={cn('flex flex-col', ui?.className)}>
  {@render children()}
</div>
