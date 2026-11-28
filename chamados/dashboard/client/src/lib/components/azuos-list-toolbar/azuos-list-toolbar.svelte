<!--
  @component
  A BARRA DA LISTA — numa linha só, logo acima dela: à ESQUERDA o formato (`AzuosTableViewToggle`,
  tabela ou cartões) e à DIREITA onde a pessoa está. Nos cartões, a barra de páginas ("1–12 de 605
  peças · Anterior · Página 1 de 51 · Próxima"); na tabela, que rola, só a contagem ("30 de 605
  peças").

  É a barra de Empresas do paralegal, para toda lista do grupo. Antes cada tela montava a dela, e
  cada uma saía num lugar: a contagem em cima numa, embaixo noutra, o exportar no meio. Exportar
  (Excel, PDF) NÃO mora aqui: a barra fala da lista, não do relatório.

  - `data.layout`: tabela ou cartões. Sem ele, a barra lê sozinha a preferência do sistema e a
    largura da janela (abaixo de `xl`, sempre cartões) — o mesmo que a tela usa para escolher.
  - `data.scroll`: na tabela, quantas estão à vista, de quantas.
  - `data.pages`: nos cartões, a página, o tamanho dela e o total.
  - `data.noun`: o que está sendo contado, no singular e no plural.
  - `ui.position = 'bottom'`: a mesma barra no PÉ dos cartões, sem o toggle — quem chegou ao último
    cartão troca de página sem rolar de volta. Na tabela ela não aparece embaixo.
  - `ui.toggle`: as props do `AzuosTableViewToggle` (o quadro das filas de chamados).
  - `actions.onPageChange`: a página nova.
-->
<script lang="ts" module>
  import type { AzuosTableViewToggleProps } from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';

  export type ListLayout = 'table' | 'card';

  export type AzuosListToolbarProps = {
    data: {
      layout?: ListLayout;
      scroll: { loaded: number; totalItems: number };
      pages: { page: number; pageSize: number; totalItems: number };
      noun: [singular: string, plural: string];
    };
    ui?: { position?: 'top' | 'bottom'; className?: string; toggle?: AzuosTableViewToggleProps };
    state?: { isLoading?: boolean };
    actions: { onPageChange: (page: number) => void };
  };

  /** Tabela só no monitor e sem a preferência "ver sempre em cards"; no resto, cartões. */
  export function listLayoutOf(input: { forceCards: boolean; isNarrow: boolean }): ListLayout {
    return input.forceCards || input.isNarrow ? 'card' : 'table';
  }

  /** "30 de 605 peças" — a contagem da tabela, que rola em vez de paginar. */
  export function scrollLabelOf(
    scroll: AzuosListToolbarProps['data']['scroll'],
    noun: AzuosListToolbarProps['data']['noun'],
  ): string {
    return `${scroll.loaded} de ${scroll.totalItems} ${scroll.totalItems === 1 ? noun[0] : noun[1]}`;
  }
</script>

<script lang="ts">
  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import { useMediaQuery, XL_BREAKPOINT } from '$lib/hooks/use-media-query/use-media-query.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: toolbarState, actions }: AzuosListToolbarProps = $props();

  const tableView = useTableViewModel();
  const narrow = useMediaQuery(XL_BREAKPOINT);

  const layout = $derived(
    data.layout ?? listLayoutOf({ forceCards: tableView.forceCards, isNarrow: narrow.current }),
  );
</script>

{#if ui?.position === 'bottom'}
  {#if layout === 'card'}
    <div class={cn('flex justify-end', ui.className)}>
      {@render position()}
    </div>
  {/if}
{:else}
  <div
    data-slot="list-toolbar"
    class={cn('flex flex-wrap items-center justify-between gap-3', ui?.className)}
  >
    <TableViewToggle ui={ui?.toggle?.ui} state={ui?.toggle?.state} actions={ui?.toggle?.actions} />
    <!-- `ml-auto`: abaixo de `xl` o toggle some, e a contagem continua encostada à direita. -->
    <div class="ml-auto">
      {@render position()}
    </div>
  </div>
{/if}

<!-- O lado direito: as páginas nos cartões, a contagem na tabela. -->
{#snippet position()}
  {#if layout === 'table'}
    <span class="text-ink-500 text-xs tabular-nums" aria-live="polite">
      {scrollLabelOf(data.scroll, data.noun)}
    </span>
  {:else}
    <PaginationBar
      data={{
        page: data.pages.page,
        pageSize: data.pages.pageSize,
        total: data.pages.totalItems,
        noun: data.noun,
      }}
      state={{ isLoading: toolbarState?.isLoading }}
      actions={{ onPageChange: actions.onPageChange }}
      ui={{ className: 'gap-3 pt-0' }}
    />
  {/if}
{/snippet}
