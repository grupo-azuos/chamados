<!--
  @component
  A CASCA de um bloco do painel: título, uma linha de explicação e o conteúdo.

  Existe porque o mesmo cartão estava copiado em cada seção, e cópia de casca é como uma tela fica
  com oito blocos de cantos, sombras e espaçamentos ligeiramente diferentes.

  É o card do padrão Apple: a superfície (`bg-card`) sem borda, com o canto de card e a sombra
  difusa. O título é um título `h2` de verdade, em frase e no cinza de apoio.

  O `tools` é para o que muda o que o bloco MOSTRA — uma alternância entre Dia, Semana e Mês, por
  exemplo. Ele fica no alto, à direita do título (embaixo dele no celular), e não depois do
  conteúdo: quem lê precisa saber o recorte ANTES de ler o número.

  - `data`: o título e a linha de explicação (`hint`).
  - `ui`: classes extras da casca e do corpo (`bodyClassName`).
  - `tools` e `children`: o controle do recorte e o conteúdo do bloco.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosPanelCardProps = {
    data: { title: string; hint?: string | null };
    ui?: { className?: string; bodyClassName?: string };
    /** O controle que muda o recorte do bloco. */
    tools?: Snippet;
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, tools, children }: AzuosPanelCardProps = $props();

  /* O título dá nome à seção: o leitor de tela anuncia "região, Receitas por mês" e dá para
     pular de painel em painel pelos marcos da página. */
  const titleId = $props.id();
</script>

<section
  aria-labelledby={titleId}
  class={cn('rounded-surface bg-card shadow-card min-w-0 p-5', ui?.className)}
>
  <!-- Empilhado no celular: título e controle lado a lado a 360 px espremem os dois. -->
  <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <h2 id={titleId} class="text-muted-foreground text-sm font-medium">
        {data.title}
      </h2>
      {#if data.hint}
        <p class="text-muted-foreground mt-0.5 text-xs">{data.hint}</p>
      {/if}
    </div>
    {#if tools}
      <div class="shrink-0">{@render tools()}</div>
    {/if}
  </div>

  <div class={cn('min-w-0', ui?.bodyClassName)}>
    {@render children()}
  </div>
</section>
