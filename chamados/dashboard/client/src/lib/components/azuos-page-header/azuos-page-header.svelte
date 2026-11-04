<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosPageHeaderProps = {
    data: { title: string; description?: string };
    ui?: { className?: string };
    /** As ações da tela, já montadas (normalmente `ActionButton`). Ficam à direita. */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosPageHeaderProps = $props();
</script>

<header
  class={cn(
    'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
    ui?.className
  )}
>
  <div class="min-w-0">
    <h1 class="text-ink-900 text-xl font-bold break-words">{data.title}</h1>
    {#if data.description}
      <p class="text-ink-500 mt-0.5 text-sm break-words">{data.description}</p>
    {/if}
  </div>
  {#if children}
    <!-- `items-center`: sem ele os itens da fileira esticam (é o padrão do flex), e um grupo
         de botões pequenos ao lado de um botão maior — os de exportar ao lado de "Cadastrar
         computador" — encosta no topo em vez de ficar na mesma linha do meio. Com o
         `flex-wrap`, o mesmo vale para a segunda linha quando a tela é estreita. -->
    <!-- `sm:shrink-0`: lado a lado com uma descrição longa, quem encolhe é o texto. Sem ele
         as ações espremiam até empilhar, e o botão mais largo vazava para fora da tela. -->
    <div class="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:shrink-0">
      {@render children()}
    </div>
  {/if}
</header>
