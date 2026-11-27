<!--
  @component
  OS ORÇAMENTOS DA MANUTENÇÃO: o que foi cotado com empresas de fora, guardado num lugar só.

  Não é uma sugestão de valores: é a gaveta dos orçamentos que já existem — o conserto, o móvel, o
  serviço — com o documento que a empresa mandou e o que foi decidido. A tela inteira: cabeçalho com
  "Guardar orçamento", busca e filtros (situação e tipo), o resumo de quantos são e quanto somam, e
  um cartão por orçamento (empresa, tipo, data, valor, situação, descrição, documento com abrir e
  baixar, corrigir e excluir). Cartão em lista, e não tabela: a descrição é uma frase. Excluir
  pergunta antes; o orçamento vai para "Removidos", onde dá para desfazer.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `quotes`, `total`, `amountCents`, `filter` e `deleting` (o que espera confirmação).
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated`, `isDeleting`,
    `error` e `deleteError`.
  - `actions`: os filtros (`onSearchChange`, `onStatusChange`, `onKindChange`, `onClearFilters`),
    `onRetry`, `onRegister`, `onEdit` e a exclusão (`onAskDelete`, `onCancelDelete`,
    `onConfirmDelete`).
-->
<script lang="ts" module>
  import {
    formatCents,
    quoteKindLabel,
    quoteKindOptions,
    quoteStatusLabel,
    quoteStatusOptions,
    quoteStatusTone,
    type QuoteKind,
    type QuoteStatus,
  } from '@template/shared/domain/maintenance-quote.util';
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';

  /**
   * OS ORÇAMENTOS DA MANUTENÇÃO: o que foi cotado com empresas de fora, guardado num lugar só.
   *
   * Não é uma sugestão de valores: é a gaveta dos orçamentos que já existem — o conserto, o
   * móvel, o serviço — com o documento que a empresa mandou e o que foi decidido.
   *
   * Cartão em lista, e não tabela: a descrição do que foi orçado é uma frase, e frase em
   * coluna de tabela vira três linhas espremidas ou um texto cortado.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   */
  export type QuoteListFilterValues = {
    search: string;
    status: QuoteStatus | '';
    kind: QuoteKind | '';
  };

  export type AzuosQuoteListViewProps = {
    data: {
      quotes: MaintenanceQuote[];
      total: number;
      amountCents: number;
      filter: QuoteListFilterValues;
      /** O orçamento esperando confirmação de exclusão — nulo quando não há. */
      deleting: MaintenanceQuote | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isDeleting?: boolean;
      error: string | null;
      deleteError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onStatusChange: (status: QuoteStatus | '') => void;
      onKindChange: (kind: QuoteKind | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (quote: MaintenanceQuote) => void;
      onAskDelete: (quote: MaintenanceQuote) => void;
      onCancelDelete: () => void;
      onConfirmDelete: () => void;
    };
  };

  const STATUS_FILTER_OPTIONS = quoteStatusOptions();
  const KIND_FILTER_OPTIONS = quoteKindOptions();
</script>

<script lang="ts">
  import FileText from '@lucide/svelte/icons/file-text';
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FileLinks from '$lib/components/azuos-file-links/azuos-file-links.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDate, formatDay } from '$lib/utils/format-date';

  let { data, state: listState, actions }: AzuosQuoteListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). A
     tabela rola inteira (padrão do grupo). */
  const cardPage = useCardPage(() => data.quotes);
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' || data.filter.status !== '' || data.filter.kind !== '',
  );

  /* "3 orçamentos · R$ 7.680,00": quantos são e quanto somam os que estão à vista. */
  const summary = $derived(
    `${data.total} ${data.total === 1 ? 'orçamento' : 'orçamentos'} · ${formatCents(data.amountCents)}`,
  );

  /* Editar e excluir: o mesmo menu de três pontinhos no card e na linha da tabela. */
  function menuOf(quote: MaintenanceQuote) {
    return {
      label: `Ações do orçamento de ${quote.supplier}`,
      items: [
        { id: 'edit', label: 'Editar', icon: Pencil },
        { id: 'delete', label: 'Excluir', icon: Trash2, isDestructive: true, separatorBefore: true },
      ],
    };
  }

  function selectMenu(quote: MaintenanceQuote, id: string) {
    if (id === 'delete') {
      actions.onAskDelete(quote);
      return;
    }
    actions.onEdit(quote);
  }

  function documentNameOf(quote: MaintenanceQuote): string {
    return quote.attachmentName ?? 'Documento do orçamento';
  }

  /* Quem mexeu por último no orçamento: é quem responde por ele. */
  function authorOf(quote: MaintenanceQuote): string {
    return quote.updatedBy ?? quote.createdBy;
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Orçamentos',
      description: 'O que foi cotado com empresas de fora: produtos, serviços e o resto.',
    }}
  >
    <ActionButton
      data={{ label: 'Guardar orçamento' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <!-- A barra de ferramentas mora sobre o fundo da página, sem card em volta: busca → filtros →
       modo de ver (design-governance §11). -->
  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Empresa ou o que foi orçado',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4">
      <FilterField data={{ label: 'Situação' }}>
        <OptionPicker
          data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
          actions={{
            onChange: (value: string) => actions.onStatusChange(value as QuoteStatus | ''),
          }}
        />
      </FilterField>

      <FilterField data={{ label: 'Tipo' }}>
        <OptionPicker
          data={{ value: data.filter.kind, options: KIND_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por tipo', allLabel: 'Todos' }}
          actions={{ onChange: (value: string) => actions.onKindChange(value as QuoteKind | '') }}
        />
      </FilterField>

      <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
        {#if hasActiveFilter && !listState.isFilteredOut}
          <ActionButton
            data={{ label: 'Limpar filtros' }}
            ui={{ variant: 'ghost', size: 'lg', icon: FilterX }}
            actions={{ onClick: actions.onClearFilters }}
          />
        {/if}
        <TableViewToggle />
      </div>
    </div>
  </div>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar os orçamentos' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <!-- O esqueleto tem a FORMA da grade: sem isso, a tela pula quando o conteúdo chega. -->
    <div class="card-grid" aria-busy="true" aria-label="Carregando os orçamentos" role="status">
      {#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
        <div class="bg-card shadow-card rounded-surface flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="mt-4 h-6 w-1/2" />
        </div>
      {/each}
    </div>
  {:else if listState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum orçamento guardado ainda',
        description: 'Quando uma empresa mandar um orçamento, guarde aqui com o documento.',
      }}
      ui={{ icon: FileText }}
    >
      <ActionButton
        data={{ label: 'Guardar orçamento' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if listState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum orçamento com esse filtro',
        description: 'Tente outra situação, ou limpe o filtro para ver todos.',
      }}
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3" aria-label="Lista de orçamentos">
      <p class="text-muted-foreground text-xs">{summary}</p>

      <!-- 1. Cards: sempre no estreito (< xl), ou quando a pessoa pediu cards. O card inteiro abre
           a correção; editar e excluir moram no menu de três pontinhos. -->
      <div class={cn('card-grid', !tableView.forceCards && 'xl:hidden')} data-slot="quote-cards">
        {#each cardPage.items as quote (quote.id)}
          <ContentCard
            data={{
              label: `Editar o orçamento de ${quote.supplier}`,
              title: quote.supplier,
              meta: `${quoteKindLabel(quote.kind)} · ${formatDay(quote.quotedOn)}`,
              status: { label: quoteStatusLabel(quote.status), tone: quoteStatusTone(quote.status) },
              tags: quote.attachmentUrl ? [] : [{ label: 'Sem documento' }],
              metrics: [{ key: 'amount', label: 'Valor', value: formatCents(quote.amountCents), tone: 'blue' }],
              /* Quem mexeu por último, com o rosto (o diretório acha a foto pelo nome). */
              footer: {
                title: authorOf(quote),
                subtitle: `Atualizado em ${formatDate(quote.updatedAt ?? quote.createdAt)}`,
                person: { name: authorOf(quote) },
              },
              openLabel: 'Editar',
              menu: menuOf(quote),
            }}
            ui={{ icon: FileText, iconTone: quoteStatusTone(quote.status), slot: 'quote-card' }}
            actions={{
              onOpen: () => actions.onEdit(quote),
              onMenuSelect: (id) => selectMenu(quote, id),
            }}
          >
            {#snippet body()}
              <p class="text-foreground line-clamp-2 text-xs">{quote.description}</p>
              {#if quote.note}
                <p class="text-muted-foreground line-clamp-2 text-xs">{quote.note}</p>
              {/if}
            {/snippet}
            {#snippet notes()}
              <!-- O documento tem as duas ações do grupo: abrir em outra aba (quem confere quer o
                   PDF ao lado da lista) e baixar com o nome original. Sobe acima do botão do card. -->
              {#if quote.attachmentUrl}
                <div class="relative z-20 flex min-w-0 flex-wrap items-center gap-2">
                  <span class="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
                    <Paperclip class="size-3.5 shrink-0" aria-hidden="true" />
                    <span class="truncate">{documentNameOf(quote)}</span>
                  </span>
                  <FileLinks
                    data={{
                      fileName: quote.attachmentName ?? 'orcamento.pdf',
                      viewUrl: quote.attachmentUrl,
                      downloadUrl: quote.attachmentUrl,
                    }}
                  />
                </div>
              {/if}
            {/snippet}
          </ContentCard>
        {/each}
      </div>
      {#if cardPage.total > cardPage.pageSize}
        <div class={cn('flex justify-center', !tableView.forceCards && 'xl:hidden')}>
          <PaginationBar
            data={{
              page: cardPage.page,
              pageSize: cardPage.pageSize,
              total: cardPage.total,
              noun: ['orçamento', 'orçamentos'],
            }}
            actions={{ onPageChange: cardPage.actions.onPageChange }}
          />
        </div>
      {/if}

      <!-- 2. Tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. Rola inteira. -->
      <div
        class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
        data-slot="quote-table"
      >
        <Table class="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo e data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Atualizado por</TableHead>
              <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.quotes as quote (quote.id)}
              <TableRow class="align-top">
                <TableCell>
                  <span class="text-foreground block font-medium break-words">{quote.supplier}</span>
                  <span class="text-muted-foreground block text-xs break-words">{quote.description}</span>
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {quoteKindLabel(quote.kind)} · {formatDay(quote.quotedOn)}
                </TableCell>
                <TableCell class="font-semibold tabular-nums whitespace-nowrap">
                  {formatCents(quote.amountCents)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    data={{ label: quoteStatusLabel(quote.status) }}
                    ui={{ tone: quoteStatusTone(quote.status), size: 'sm' }}
                  />
                </TableCell>
                <TableCell>
                  {#if quote.attachmentUrl}
                    <span class="flex min-w-0 flex-col gap-1">
                      <span class="text-muted-foreground max-w-48 truncate text-xs">{documentNameOf(quote)}</span>
                      <FileLinks
                        data={{
                          fileName: quote.attachmentName ?? 'orcamento.pdf',
                          viewUrl: quote.attachmentUrl,
                          downloadUrl: quote.attachmentUrl,
                        }}
                      />
                    </span>
                  {:else}
                    <span class="text-muted-foreground text-xs">Sem documento</span>
                  {/if}
                </TableCell>
                <TableCell>
                  <span class="flex items-center gap-2">
                    <PersonAvatar name={authorOf(quote)} ui={{ size: 'sm' }} />
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate">{authorOf(quote)}</span>
                      <span class="text-muted-foreground text-xs">
                        {formatDate(quote.updatedAt ?? quote.createdAt)}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell class="text-right">
                  <TableActions>
                    <ActionMenu
                      data={menuOf(quote)}
                      ui={{ isIconOnly: true }}
                      actions={{ onSelect: (id) => selectMenu(quote, id) }}
                    />
                  </TableActions>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os orçamentos mais recentes. Use a busca para achar o que falta.
        </p>
      {/if}
    </section>
  {/if}
</div>

<!-- Excluir arquiva, mas some da tela: pergunta antes, com a empresa na frase. -->
<ConfirmDialog
  data={{
    title: 'Excluir este orçamento?',
    description: data.deleting
      ? `O orçamento de "${data.deleting.supplier}" sai da lista, com o documento guardado. Ele fica em "Removidos", onde dá para desfazer.`
      : '',
    confirmLabel: 'Excluir orçamento',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.deleting !== null,
    isConfirming: listState.isDeleting,
    error: listState.deleteError,
  }}
  actions={{ onConfirm: actions.onConfirmDelete, onCancel: actions.onCancelDelete }}
/>
