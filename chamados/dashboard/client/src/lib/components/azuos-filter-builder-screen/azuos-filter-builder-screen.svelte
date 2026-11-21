<script lang="ts" module>
  import {
    type BoardModule,
    type SavedFilter,
    saveFilterSchema,
    type SaveFilterInput,
  } from '@template/shared/schemas/dashboard-board.schema';
  import { type Snippet } from 'svelte';

  /**
   * O MONTADOR DE FILTRO — a tela que se expande. À esquerda, os filtros salvos do módulo (os seus
   * e os da equipe), para abrir, arquivar ou trazer de volta; à direita, o canvas: nome, para quem
   * é, de qual fonte, e a árvore de grupos E/OU, um dentro do outro. O mesmo desenho do paralegal.
   *
   * O que falta aparece antes de salvar, em frase — o mesmo que o servidor recusaria.
   */
  export type AzuosFilterBuilderScreenProps = {
    data: {
      module: BoardModule;
      filters: SavedFilter[];
      archived: SavedFilter[];
      /** O filtro aberto no montador: um que existe, ou um novo (`'new'` ou nenhum escolhido). */
      editing: SavedFilter | 'new' | null;
    };
    state: { isOpen: boolean; isSaving?: boolean; isArchiving?: boolean; error?: string | null };
    actions: {
      onClose: () => void;
      onNew: () => void;
      onEdit: (filter: SavedFilter) => void;
      onCancelEdit: () => void;
      onSave: (id: string | null, body: SaveFilterInput) => void;
      onArchive: (id: string) => void;
      onRestore: (id: string) => void;
    };
  };

  /**
   * O que falta para salvar, em frases — sem repetir. É LEMBRETE, não erro: aparece neutro antes
   * de a pessoa ter digitado qualquer coisa.
   */
  export function problemsOf(form: unknown): string[] {
    const parsed = saveFilterSchema.safeParse(form);
    if (parsed.success) return [];

    return [...new Set(parsed.error.issues.map((issue) => issue.message))];
  }
</script>

<script lang="ts">
  import Archive from '@lucide/svelte/icons/archive';
  import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CircleDashed from '@lucide/svelte/icons/circle-dashed';
  import Info from '@lucide/svelte/icons/info';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Save from '@lucide/svelte/icons/save';
  import {
    DATA_SOURCES,
    type DataSourceKey,
    EMPTY_FILTER,
    type FilterGroup,
    sourcesOf,
  } from '@template/shared/schemas/dashboard-board.schema';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import AzuosFilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import AzuosFilterGroupEditor from '$lib/components/azuos-filter-group-editor/azuos-filter-group-editor.svelte';
  import AzuosSegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import AzuosSelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import AzuosTextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import AzuosTextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { withIds } from '$lib/utils/filter-builder.util';

  let { data, state: screenState, actions }: AzuosFilterBuilderScreenProps = $props();

  type Form = { name: string; description: string; source: DataSourceKey; scope: 'personal' | 'shared'; tree: FilterGroup };

  const SCOPE_OPTIONS = [
    { value: 'personal', label: 'Só eu' },
    { value: 'shared', label: 'Toda a equipe' },
  ];

  let form = $state<Form | null>(null);
  let openedKey = $state<string | null>(null);

  /* Abrir outro filtro (ou um novo) recomeça o formulário pelo que ele é. Sem nenhum escolhido, a
     tela já abre num filtro novo — é o que se vem fazer aqui. */
  $effect(() => {
    if (!screenState.isOpen) {
      openedKey = null;
      return;
    }
    const editing = data.editing;
    const key = editing === null || editing === 'new' ? 'new' : editing.id;
    if (key === openedKey) return;
    openedKey = key;
    form = formOf(editing);
  });

  function formOf(editing: SavedFilter | 'new' | null): Form {
    if (editing === null || editing === 'new') {
      return { name: '', description: '', source: sourcesOf(data.module)[0]!, scope: 'personal', tree: withIds(EMPTY_FILTER) };
    }

    return {
      name: editing.name,
      description: editing.description ?? '',
      source: editing.source,
      scope: editing.scope,
      tree: withIds(editing.tree),
    };
  }

  const body = $derived(form ? { ...form, description: form.description || null } : null);
  const problems = $derived(body ? problemsOf(body) : []);
  const editingId = $derived(data.editing && data.editing !== 'new' ? data.editing.id : null);
  const sourceOptions = $derived(sourcesOf(data.module).map((key) => ({ value: key, label: DATA_SOURCES[key].label })));

  function save() {
    if (!body || problems.length > 0) return;
    const parsed = saveFilterSchema.safeParse(body);
    if (parsed.success) actions.onSave(editingId, parsed.data);
  }
</script>

{#snippet formGroup(legend: string, hint: string, content: Snippet)}
  <!-- Um grupo do formulário, com nome e uma frase do que ele decide. -->
  <fieldset class="rounded-surface bg-card shadow-card flex flex-col gap-4 p-4">
    <legend class="text-ink-900 float-left mb-1 w-full px-1 text-sm font-bold">
      {legend}
      <span class="text-ink-500 ml-2 text-xs font-normal">{hint}</span>
    </legend>
    {@render content()}
  </fieldset>
{/snippet}

<AzuosExpandableScreen
  data={{
    title: editingId ? 'Editar filtro' : 'Montar filtro',
    description: 'Grupos E/OU, um dentro do outro. O filtro salvo serve a qualquer bloco do painel.',
  }}
  state={{ isOpen: screenState.isOpen }}
  actions={{ onClose: actions.onClose }}
>
  {#snippet footer()}
    <AzuosActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClose }} />
    <AzuosActionButton
      data={{ label: 'Salvar filtro', loadingLabel: 'Salvando…' }}
      ui={{ icon: Save }}
      state={{ isDisabled: problems.length > 0, isLoading: screenState.isSaving }}
      actions={{ onClick: save }}
    />
  {/snippet}

  <div class="grid gap-6 p-6 lg:grid-cols-[18rem_1fr]">
    <aside aria-label="Filtros salvos" class="flex flex-col gap-4">
      <div>
        <div class="mb-2 flex items-center justify-between gap-2">
          <h3 class="text-ink-900 text-sm font-semibold">Filtros salvos</h3>
          <AzuosActionButton data={{ label: 'Novo filtro' }} ui={{ variant: 'ghost', size: 'sm', icon: Plus }} actions={{ onClick: actions.onNew }} />
        </div>
        {#if data.filters.length === 0}
          <p class="text-ink-500 text-sm">Nenhum ainda. O que você salvar aparece aqui.</p>
        {/if}
        <ul class="flex flex-col gap-1">
          {#each data.filters as filter (filter.id)}
            <li class="rounded-box hover:bg-accent flex items-center justify-between gap-2 px-2 py-1.5">
              <span class="min-w-0">
                <span class="text-ink-900 block truncate text-sm font-medium">{filter.name}</span>
                <span class="text-ink-500 block truncate text-xs">
                  {DATA_SOURCES[filter.source].label} · {filter.scope === 'shared' ? 'Equipe' : 'Só eu'}
                </span>
              </span>
              {#if filter.canEdit}
                <span class="flex shrink-0">
                  <AzuosActionButton
                    data={{ label: `Editar ${filter.name}` }}
                    ui={{ variant: 'ghost', size: 'sm', icon: Pencil, isIconOnly: true }}
                    actions={{ onClick: () => actions.onEdit(filter) }}
                  />
                  <AzuosActionButton
                    data={{ label: `Arquivar ${filter.name}` }}
                    ui={{ variant: 'ghost', size: 'sm', icon: Archive, isIconOnly: true }}
                    state={{ isDisabled: screenState.isArchiving }}
                    actions={{ onClick: () => actions.onArchive(filter.id) }}
                  />
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
      {#if data.archived.length > 0}
        <div>
          <h3 class="text-ink-500 mb-2 text-xs font-semibold">Arquivados</h3>
          <ul class="flex flex-col gap-1">
            {#each data.archived as filter (filter.id)}
              <li class="flex items-center justify-between gap-2 px-2 py-1">
                <span class="text-ink-500 truncate text-sm">{filter.name}</span>
                {#if filter.canEdit}
                  <AzuosActionButton
                    data={{ label: `Desarquivar ${filter.name}` }}
                    ui={{ variant: 'ghost', size: 'sm', icon: ArchiveRestore, isIconOnly: true }}
                    actions={{ onClick: () => actions.onRestore(filter.id) }}
                  />
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </aside>

    {#if form}
      {@const current = form}
      <!-- Dois grupos com nome (Lei de Miller): o que o filtro É (nome, descrição, quem usa) e o
           que ele PEGA (a fonte e as condições). -->
      <section aria-label="O filtro" class="flex min-w-0 flex-col gap-5">
        {#snippet about()}
          <!-- Nome e "Quem usa" na mesma linha — são as duas decisões curtas; a descrição, texto
               livre e opcional, fica embaixo com espaço para escrever. -->
          <div class="flex flex-col gap-4 md:flex-row md:items-end">
            <AzuosTextField
              data={{ label: 'Nome do filtro', name: 'filterName', value: current.name, placeholder: 'Ex.: Urgentes do mês', isRequired: true }}
              ui={{ className: 'min-w-0 flex-1' }}
              actions={{ onChange: (name) => (form = { ...current, name }) }}
            />
            <AzuosFilterField data={{ label: 'Quem usa' }}>
              <AzuosSegmentedControl
                data={{ value: current.scope, options: SCOPE_OPTIONS }}
                ui={{ ariaLabel: 'Quem usa o filtro' }}
                actions={{ onChange: (scope) => (form = { ...current, scope: scope as 'personal' | 'shared' }) }}
              />
            </AzuosFilterField>
          </div>
          <AzuosTextAreaField
            data={{ label: 'Descrição (opcional)', name: 'filterDescription', value: current.description, placeholder: 'Para que serve este filtro, em uma frase.' }}
            ui={{ rows: 3 }}
            actions={{ onChange: (description) => (form = { ...current, description }) }}
          />
        {/snippet}
        {@render formGroup('Sobre o filtro', 'Como ele aparece na lista e quem pode usar.', about)}

        {#snippet conditions()}
          <AzuosFilterField data={{ label: 'Fonte de dados' }}>
            <AzuosSelectField
              data={{ value: current.source, options: sourceOptions }}
              ui={{ ariaLabel: 'Fonte de dados', className: 'w-full md:w-72' }}
              actions={{ onChange: (source) => (form = { ...current, source: source as DataSourceKey, tree: withIds(EMPTY_FILTER) }) }}
            />
          </AzuosFilterField>
          <AzuosFilterGroupEditor data={{ source: current.source, group: current.tree }} actions={{ onChange: (tree) => (form = { ...current, tree }) }} />
          {#if current.tree.rules.length === 0}
            <p class="text-ink-500 flex items-center gap-2 text-sm">
              <Info class="size-4 shrink-0" aria-hidden="true" />
              Nenhuma condição ainda: o filtro pega tudo de {DATA_SOURCES[current.source].noun}. Use "Condição" para recortar.
            </p>
          {/if}
        {/snippet}
        {@render formGroup('As condições', 'Quais itens entram. Sem condição, entra tudo.', conditions)}

        {#if problems.length > 0 || screenState.error}
          <div class="flex flex-col gap-2">
            {#if problems.length > 0}
              <div class="rounded-box bg-muted text-ink-700 p-3 text-sm">
                <p class="text-ink-900 mb-1 font-semibold">Para salvar:</p>
                <ul class="flex flex-col gap-1">
                  {#each problems as problem (problem)}
                    <li class="flex items-center gap-2">
                      <CircleDashed class="text-ink-500 size-4 shrink-0" aria-hidden="true" />
                      {problem}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if screenState.error}
              <!-- Vermelho só o que deu errado de verdade — a recusa do servidor. -->
              <p role="alert" class="text-destructive flex items-center gap-2 text-sm font-medium">
                <CircleAlert class="size-4 shrink-0" aria-hidden="true" />
                {screenState.error}
              </p>
            {/if}
          </div>
        {/if}
      </section>
    {/if}
  </div>
</AzuosExpandableScreen>
