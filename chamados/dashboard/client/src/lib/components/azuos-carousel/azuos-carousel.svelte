<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Uma faixa que desliza para o lado — arrastando com o mouse ou o dedo, ou pelas setas nas
   * pontas.
   *
   * Existe para a fileira que não cabe numa linha: com doze cartões, a grade virava três linhas e
   * empurrava a lista (que é o que a pessoa veio ver) para baixo da dobra. Na faixa, o que sobra
   * fica a um arraste de distância, e a altura é sempre a de UM cartão.
   *
   * As setas saem da posição do shadcn (penduradas FORA da caixa) e entram na própria linha:
   * penduradas, elas caíam em cima do menu lateral. O rótulo é em português.
   *
   * No Svelte os itens vêm em `data.items` e cada um é desenhado pelo snippet `item` — é o jeito
   * de embrulhar cada filho num item da faixa, que no React era `Children.map`.
   */
  export type AzuosCarouselProps<T> = {
    data: { items: T[] };
    ui: {
      /** O nome da faixa para o leitor de tela ("Resumo por status"). */
      ariaLabel: string;
      /** Quanto cada item ocupa da faixa — `basis-1/2 lg:basis-1/4`, por exemplo. */
      itemClassName?: string;
      className?: string;
    };
    item: Snippet<[T, number]>;
  };
</script>

<script lang="ts" generics="T">
  import * as Carousel from '$lib/components/ui/carousel';
  import { cn } from '$lib/utils/cn';

  let { data, ui, item }: AzuosCarouselProps<T> = $props();

  const ARROW_CLASS = 'rounded-control static size-(--control-lg) shrink-0 translate-x-0 translate-y-0';
</script>

<!-- `dragFree`: solta, a faixa corre um pouco e para onde parou, como uma lista de celular —
     presa cartão a cartão, arrastar doze virava uma sequência de trancos. -->
<Carousel.Root
  role="region"
  aria-label={ui.ariaLabel}
  opts={{ align: 'start', dragFree: true }}
  class={cn('flex items-center gap-2', ui.className)}
>
  <Carousel.Previous class={ARROW_CLASS} aria-label="Ver anteriores" />
  <!-- A faixa corta o que sai dela — e a sombra do hover sai. A folga de dentro dá espaço; a
       margem negativa de fora devolve a altura. A área vazia não recebe clique, só os itens. -->
  <div class="pointer-events-none -mt-4 -mb-9 min-w-0 flex-1">
    <Carousel.Content class="-ml-3 pt-6 pb-11 pl-3">
      {#each data.items as entry, index (index)}
        <Carousel.Item class={cn('pointer-events-auto pl-3 last:pr-3', ui.itemClassName)}>
          {@render item(entry, index)}
        </Carousel.Item>
      {/each}
    </Carousel.Content>
  </div>
  <Carousel.Next class={ARROW_CLASS} aria-label="Ver próximos" />
</Carousel.Root>
