<!--
  @component
  O HISTÓRICO de um módulo — a linha do tempo de quem cadastrou, alterou, arquivou ou devolveu o
  quê, e quando, com o que mudou campo a campo. A mesma tela nos três módulos: só muda o módulo,
  e cada um vê só o que é dele.

  Função pura de props (CONTRIBUTING §3): não busca nada. Por isso abre no Storybook carregando,
  vazia, filtrada e em erro.

  O molde é o de toda tela: cabeçalho → barra de ferramentas (busca → filtros → de quem) →
  conteúdo → paginação. Cada linha é uma etapa do `AzuosTimeline`, com o ícone cheio no tom do
  que a ação fez e o rosto de quem fez (com a foto) — o selo diz o tipo em palavras, para a cor
  não falar sozinha.

  - `data`: o módulo, as linhas, o filtro e a página.
  - `state`: carregando, buscando e o erro.
  - `actions`: mudar e limpar o filtro, trocar de página e tentar de novo.
-->
<script lang="ts" module>
  import { type RoleContext } from '@template/shared/domain/role-context.util';
  import {
    HISTORY_KIND_LABELS,
    HISTORY_KINDS,
    historyTargetLabel,
    historyTargetsOf,
    type HistoryEntry,
    type HistoryKind,
  } from '@template/shared/schemas/history.schema';

  import { type HistoryFilter } from '$lib/hooks/use-history/use-history.svelte';

  export type AzuosHistoryViewProps = {
    data: {
      module: RoleContext;
      entries: HistoryEntry[];
      filter: HistoryFilter;
      page: number;
      pageSize: number;
      total: number;
    };
    state: { isLoading: boolean; isFetching: boolean; error: string | null };
    actions: {
      onFilterChange: (patch: Partial<HistoryFilter>) => void;
      onClearFilters: () => void;
      onPageChange: (page: number) => void;
      onRetry: () => void;
    };
  };

  export const WHO_OPTIONS = [
    { value: 'all', label: 'De todos' },
    { value: 'mine', label: 'O que eu fiz' },
  ];

  export const KIND_OPTIONS = [
    { value: '', label: 'Todas as ações' },
    ...HISTORY_KINDS.map((kind) => ({ value: kind, label: HISTORY_KIND_LABELS[kind] })),
  ];

  /** Os tipos de registro DESTE módulo, em ordem alfabética — com mais de dez, o campo tem busca. */
  export function targetOptionsOf(module: RoleContext): { value: string; label: string }[] {
    const options = historyTargetsOf(module)
      .map((type) => ({ value: type, label: historyTargetLabel(type) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

    return [{ value: '', label: 'Todos os tipos' }, ...options];
  }

  /** O tom do ícone e do selo pelo que a ação fez: criar, alterar, tirar ou devolver. */
  export const KIND_TONES: Record<HistoryKind, 'brand' | 'neutral' | 'danger' | 'success'> = {
    created: 'brand',
    updated: 'neutral',
    archived: 'danger',
    restored: 'success',
  };

  export function hasHistoryFilter(filter: HistoryFilter): boolean {
    return (
      filter.who !== 'all' ||
      Boolean(filter.targetType || filter.kind || filter.search.trim() || filter.from || filter.to)
    );
  }

  /** "Alterou · Manutenção CH-12": o que foi feito e em quê, com o nome que a pessoa viu. */
  export function entryTitleOf(entry: HistoryEntry): string {
    const target = historyTargetLabel(entry.target.type);
    const name = entry.target.label ?? (entry.target.id ? `nº ${entry.target.id}` : null);

    return [HISTORY_KIND_LABELS[entry.kind], name ? `${target} ${name}` : target].join(' · ');
  }

  /** "02/10/2026 às 23:30" — sem os segundos, que ninguém lê numa linha do tempo. */
  export function formatHistoryDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    const day = date.toLocaleDateString('pt-BR');
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `${day} às ${time}`;
  }

  /** "Situação: — → Resolvido" — uma linha por campo que mudou. */
  export function changeLineOf(change: HistoryEntry['changes'][number]): string {
    return `${change.field}: ${change.from ?? '—'} → ${change.to ?? '—'}`;
  }
</script>

<script lang="ts">
  import Archive from '@lucide/svelte/icons/archive';
  import History from '@lucide/svelte/icons/history';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ClearFiltersButton from '$lib/components/azuos-clear-filters-button/azuos-clear-filters-button.svelte';
  import ComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import DateRangeField from '$lib/components/azuos-date-range-field/azuos-date-range-field.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import Timeline from '$lib/components/azuos-timeline/azuos-timeline.svelte';
  import TimelineStep from '$lib/components/azuos-timeline-step/azuos-timeline-step.svelte';

  let { data, state, actions }: AzuosHistoryViewProps = $props();

  const KIND_ICONS = { created: Plus, updated: Pencil, archived: Archive, restored: RotateCcw };

  const targetOptions = $derived(targetOptionsOf(data.module));
  const hasFilter = $derived(hasHistoryFilter(data.filter));
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Histórico',
      description: 'Quem mudou o quê e quando neste módulo — com o que mudou, campo a campo.',
    }}
    ui={{ icon: History }}
  />

  <!-- A barra de ferramentas, sobre o fundo da página (filtro não mora em card): busca → filtros
       → de quem → limpar. -->
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
      <TextField
        data={{
          label: 'Buscar',
          name: 'historySearch',
          value: data.filter.search,
          placeholder: 'Protocolo, nome da máquina, produto ou sistema',
        }}
        actions={{ onChange: (search) => actions.onFilterChange({ search }) }}
      />
      <DateRangeField
        data={{ label: 'Período', name: 'historyPeriod', value: { from: data.filter.from, to: data.filter.to } }}
        ui={{ placeholder: 'Qualquer dia' }}
        actions={{ onChange: (range) => actions.onFilterChange({ from: range.from, to: range.to }) }}
      />
      <ComboboxField
        data={{ value: data.filter.targetType, options: targetOptions }}
        ui={{ ariaLabel: 'Tipo de registro', placeholder: 'Todos os tipos', searchPlaceholder: 'Buscar tipo…' }}
        actions={{ onChange: (targetType) => actions.onFilterChange({ targetType }) }}
      />
      <SelectField
        data={{ value: data.filter.kind, options: KIND_OPTIONS }}
        ui={{ ariaLabel: 'Ação', placeholder: 'Todas as ações' }}
        actions={{ onChange: (kind) => actions.onFilterChange({ kind: kind as HistoryKind | '' }) }}
      />
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <SegmentedControl
        data={{ value: data.filter.who, options: WHO_OPTIONS }}
        ui={{ ariaLabel: 'De quem' }}
        actions={{ onChange: (who) => actions.onFilterChange({ who: who as HistoryFilter['who'] }) }}
      />
      {#if hasFilter}
        <ClearFiltersButton state={{ hasFilter }} actions={{ onClear: actions.onClearFilters }} />
      {/if}
    </div>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if state.error}
    <ErrorState
      data={{ title: 'O histórico não carregou', message: state.error }}
      state={{ isRetrying: state.isFetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <!-- O esqueleto tem a forma da linha do tempo: ícone, título e a linha de quem fez. -->
    <div class="flex flex-col gap-6" aria-busy="true" aria-label="Carregando o histórico">
      {#each [0, 1, 2, 3] as index (index)}
        <div class="flex gap-4">
          <Skeleton class="size-8 shrink-0 rounded-full" />
          <div class="flex flex-1 flex-col gap-2">
            <Skeleton class="h-4 w-1/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>
      {/each}
    </div>
  {:else if data.entries.length === 0}
    <EmptyState
      data={
        hasFilter
          ? { title: 'Nada no histórico com estes filtros', description: 'Tente outro período ou limpe os filtros.' }
          : { title: 'Nada no histórico ainda', description: 'Toda mudança feita neste módulo aparece aqui.' }
      }
      ui={{ icon: hasFilter ? SearchX : History }}
    />
  {:else}
    <section aria-label="Linha do tempo do histórico">
      <Timeline>
        {#each data.entries as entry, index (entry.id)}
          <TimelineStep
            data={{
              title: entryTitleOf(entry),
              description: formatHistoryDateTime(entry.occurredAt),
              icon: KIND_ICONS[entry.kind],
            }}
            ui={{ tone: KIND_TONES[entry.kind], isLast: index === data.entries.length - 1 }}
          >
            <div class="flex items-center gap-2">
              <PersonAvatar name={entry.actor.name ?? 'Sistema'} personId={entry.actor.id} ui={{ size: 'sm' }} />
              <span class="text-foreground text-sm font-medium">{entry.actor.name ?? 'Sistema'}</span>
            </div>
            {#if entry.changes.length > 0}
              <ul class="text-muted-foreground flex flex-col gap-0.5 text-xs break-words">
                {#each entry.changes as change (change.field)}
                  <li>{changeLineOf(change)}</li>
                {/each}
              </ul>
            {/if}
          </TimelineStep>
        {/each}
      </Timeline>
    </section>
  {/if}

  {#if data.total > 0}
    <PaginationBar
      data={{ page: data.page, pageSize: data.pageSize, total: data.total, noun: ['registro', 'registros'] }}
      state={{ isLoading: state.isFetching }}
      actions={{ onPageChange: actions.onPageChange }}
    />
  {/if}
</div>
