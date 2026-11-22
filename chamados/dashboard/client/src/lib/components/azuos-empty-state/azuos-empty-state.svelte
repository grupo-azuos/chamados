<!--
  @component
  A lista vazia, com o que fazer a respeito.

  Vazio não é erro, e a tela não pode parecer quebrada: borda tracejada (não cheia), ícone neutro e,
  quando faz sentido, o botão que resolve. Tela que some sem explicação é como alguém conclui que o
  sistema perdeu os dados.

  Props: `data` traz o título e a descrição; `ui` traz o ícone (a caixa de entrada, se nenhum vier)
  e a classe; `children` é a ação sugerida, já montada (normalmente um `ActionButton`).
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  export type AzuosEmptyStateProps = {
    data: { title: string; description?: string };
    ui?: { icon?: LucideIcon; className?: string };
    /** A ação sugerida, já montada (normalmente um `ActionButton`). */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import Inbox from '@lucide/svelte/icons/inbox';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosEmptyStateProps = $props();

  const Icon = $derived(ui?.icon ?? Inbox);
</script>

<div
  class={cn(
    'border-ink-300 flex flex-col items-center justify-center gap-2 rounded-box border border-dashed px-6 py-12 text-center',
    ui?.className
  )}
>
  <span class="bg-ink-100 text-ink-500 flex size-11 items-center justify-center rounded-full">
    <Icon class="size-5" aria-hidden="true" />
  </span>
  <p class="text-ink-900 text-sm font-semibold">{data.title}</p>
  {#if data.description}
    <p class="text-ink-500 max-w-sm text-sm">{data.description}</p>
  {/if}
  {#if children}
    <div class="mt-2">
      {@render children()}
    </div>
  {/if}
</div>
