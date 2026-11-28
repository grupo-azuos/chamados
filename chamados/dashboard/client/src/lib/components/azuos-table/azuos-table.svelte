<!--
  @component
  A TABELA DA CASA: o `ui/table` do shadcn dentro de uma superfície de cartão (raio, fundo e sombra,
  sem borda), com um rodapé opcional para a fonte do dado e a contagem.

  AS REGRAS DA LINHA, iguais em todo sistema (o paralegal é a régua):
  - o cabeçalho é FRASE, em cinza, sem faixa de fundo ("Responsável", nunca "RESPONSÁVEL");
  - o que mora numa célula — texto, selo, número — NÃO leva borda nem caixa em volta: a linha já é
    a moldura. Selo é o `AzuosStatusBadge` (fundo claro do tom, sem borda); valor vazio é o traço
    do `TableText`, nunca uma caixinha escrita "Não definido";
  - texto livre (nome, cidade, grupo) passa pelo `TableText` com a LARGURA MÁXIMA da coluna
    (`max-w-72` no nome, `max-w-36` no resto): ele corta com "…" numa linha só, em vez de quebrar
    o nome em três linhas enquanto sobra espaço noutra coluna;
  - a AÇÃO DA LINHA é só ícone, na coluna estreita e presa à direita (`TableActionsHead` +
    `TableActionsCell`): o menu de três pontinhos (`AzuosActionMenu` com `isIconOnly`) e, se
    houver, a ação principal como `AzuosActionButton` só ícone, com o nome no balão.

  Tudo isto normalmente acaba editado à mão dentro de `ui/table` — e some no próximo `shadcn add`.
  Aqui o `ui/` fica original, e a aparência mora neste arquivo e nas peças ao lado
  (`azuos-table-row`, `-cell`, `-head`…). Quem usa importa tudo de `azuos-table.ts`.

  Recebe os atributos de uma tabela (`table`), mais `containerClass` (classes da superfície em
  volta, para a tabela que já mora dentro de um cartão) e o snippet `footer` (fonte do dado à
  esquerda, contagem à direita). Quem rola para o lado é a caixa de dentro, não a página.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';

  export type AzuosTableProps = HTMLTableAttributes & {
    ref?: HTMLTableElement | null;
    /** Classes da superfície em volta — para a tabela que já mora dentro de um cartão. */
    containerClass?: string;
    /** Fonte do dado à esquerda, contagem à direita. */
    footer?: Snippet;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { Table } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  let {
    class: className,
    containerClass,
    ref = $bindable(null),
    footer,
    children,
    ...restProps
  }: AzuosTableProps = $props();
</script>

<div
  data-slot="table-surface"
  class={cn(
    'bg-card rounded-surface w-full overflow-hidden shadow-card',
    containerClass,
  )}
>
  <!-- Quem rola para o lado é a caixa de dentro (o contêiner do próprio shadcn), não a página. -->
  <Table bind:ref class={cn('text-left', className)} {...restProps}>
    {@render children?.()}
  </Table>

  {#if footer}
    <div
      class="border-border text-muted-foreground flex items-center justify-between border-t px-3 py-3 text-xs"
    >
      {@render footer()}
    </div>
  {/if}
</div>
