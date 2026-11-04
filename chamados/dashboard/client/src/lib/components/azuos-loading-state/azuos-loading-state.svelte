<script lang="ts" module>
  /**
   * "Carregando…" com o que está carregando.
   *
   * O texto diz O QUÊ, e não só que há espera: numa tela com lista e painel lado a lado, um
   * girador sem legenda deixa a pessoa sem saber se é a lista que falhou ou se ainda vem.
   */
  export type AzuosLoadingStateProps = {
    data: { label: string };
    ui?: { className?: string };
  };
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosLoadingStateProps = $props();
</script>

<div
  role="status"
  aria-live="polite"
  class={cn('text-ink-500 flex items-center justify-center gap-2 py-10 text-sm', ui?.className)}
>
  <Loader2 class="size-4 animate-spin" aria-hidden="true" />
  {data.label}
</div>
