<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * UM TEXTO QUE PODE NÃO CABER NA COLUNA: cortado com "…", e o texto inteiro num balão ao
   * passar o mouse.
   *
   * O balão só abre quando o corte aconteceu de verdade — "Aguardando" inteiro na tela não
   * precisa repetir "Aguardando" em cima. Quem corta é a classe passada em `ui.className`
   * (`truncate`, `line-clamp-2`) ou o filho (o selo do status corta a si mesmo): os dois são
   * medidos.
   */
  export type AzuosTruncatedTextProps = {
    data: { text: string };
    ui?: { className?: string };
    /** O que aparece na célula. Sem filho, é o próprio texto. */
    children?: Snippet;
  };

  /** Cortou se o conteúdo é maior que a caixa — na largura (`truncate`) ou na altura (`line-clamp`). */
  export function isClipped(element: Element | null | undefined): boolean {
    if (!element) return false;

    return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
  }
</script>

<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosTruncatedTextProps = $props();

  let element = $state<HTMLSpanElement | null>(null);
  let isOpen = $state(false);

  function changeOpen(next: boolean) {
    isOpen = next && (isClipped(element) || isClipped(element?.firstElementChild));
  }
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root bind:open={() => isOpen, changeOpen}>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <span {...props} bind:this={element} class={cn('block min-w-0', ui?.className)}>
          {#if children}
            {@render children()}
          {:else}
            {data.text}
          {/if}
        </span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-xs">{data.text}</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
