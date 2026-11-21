<script lang="ts" module>
  import {
    type BoardModule,
    type SavedFilter,
    type SaveFilterInput,
  } from '@template/shared/schemas/dashboard-board.schema';

  /**
   * OS FILTROS SALVOS DO MÓDULO — a lista (com os arquivados e o "Desfazer") e o montador de um
   * filtro: o nome, a fonte, quem vê (só eu ou o módulo) e as condições em grupos "E/OU".
   *
   * O formulário é estado VISUAL deste diálogo; "Salvar filtro" entrega o filtro pronto à tela, e
   * o contrato confere antes — o motivo da recusa aparece aqui, em vermelho.
   */
  export type AzuosFilterBuilderDialogProps = {
    data: {
      module: BoardModule;
      filters: SavedFilter[];
      archived: SavedFilter[];
      /** O filtro aberto no montador: um que existe, um novo, ou nenhum (a lista). */
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
</script>

<script lang="ts">
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import {
    DATA_SOURCES,
    type DataSourceKey,
    EMPTY_FILTER,
    type FilterGroup,
    saveFilterSchema,
    sourcesOf,
  } from '@template/shared/schemas/dashboard-board.schema';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ArchivedList from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import FilterGroupEditor from '$lib/components/azuos-filter-group-editor/azuos-filter-group-editor.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { withIds } from '$lib/utils/filter-builder.util';

  let { data, state: dialogState, actions }: AzuosFilterBuilderDialogProps = $props();

  type Form = { name: string; description: string; source: DataSourceKey; scope: 'personal' | 'shared'; tree: FilterGroup };

  let form = $state<Form | null>(null);
  let problem = $state<string | null>(null);
  let openedKey = $state<string | null>(null);

  /* Abrir outro filtro (ou um novo) recomeça o formulário pelo que ele é. */
  $effect(() => {
    const editing = data.editing;
    const key = editing === null ? null : editing === 'new' ? 'new' : editing.id;
    if (key === openedKey) return;
    openedKey = key;
    problem = null;
    form = formOf(editing);
  });

  function formOf(editing: SavedFilter | 'new' | null): Form | null {
    if (editing === null) return null;
    if (editing === 'new') {
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

  function submit() {
    if (!form) return;
    const parsed = saveFilterSchema.safeParse({ ...form, description: form.description || null });
    if (!parsed.success) {
      problem = parsed.error.issues[0]?.message ?? 'Confira o filtro.';
      return;
    }
    actions.onSave(data.editing && data.editing !== 'new' ? data.editing.id : null, parsed.data);
  }
</script>

<Dialog open={dialogState.isOpen} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}>
  <DialogContent showCloseButton={false} class="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
    <DialogHeader class="gap-1.5">
      <DialogTitle class="text-lg font-semibold tracking-tight">Filtros salvos</DialogTitle>
      <DialogDescription class="text-muted-foreground text-xs">
        Monte um filtro uma vez e use em qualquer bloco do painel. "Eu" vale para quem estiver vendo.
      </DialogDescription>
    </DialogHeader>

    {#if form}
      {@const current = form}
      <div class="flex flex-col gap-4">
        <div class="grid gap-3 md:grid-cols-2">
          <TextField
            data={{ label: 'Nome', name: 'filter-name', value: current.name, isRequired: true }}
            actions={{ onChange: (name) => (form = { ...current, name }) }}
          />
          <TextField
            data={{ label: 'Descrição', name: 'filter-description', value: current.description }}
            actions={{ onChange: (description) => (form = { ...current, description }) }}
          />
          <div class="flex flex-col gap-1.5">
            <span class="text-ink-700 text-sm font-medium">Fonte de dados</span>
            <SelectField
              data={{ value: current.source, options: sourcesOf(data.module).map((source) => ({ value: source, label: DATA_SOURCES[source].label })) }}
              ui={{ ariaLabel: 'Fonte de dados' }}
              actions={{ onChange: (source) => (form = { ...current, source: source as DataSourceKey, tree: withIds(EMPTY_FILTER) }) }}
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-ink-700 text-sm font-medium">Quem vê</span>
            <SelectField
              data={{ value: current.scope, options: [{ value: 'personal', label: 'Só eu' }, { value: 'shared', label: 'Todo o módulo' }] }}
              ui={{ ariaLabel: 'Quem vê o filtro' }}
              actions={{ onChange: (scope) => (form = { ...current, scope: scope as 'personal' | 'shared' }) }}
            />
          </div>
        </div>

        <FilterGroupEditor data={{ source: current.source, group: current.tree }} actions={{ onChange: (tree) => (form = { ...current, tree }) }} />

        {#if problem ?? dialogState.error}
          <p role="alert" class="text-destructive text-sm font-medium">{problem ?? dialogState.error}</p>
        {/if}
      </div>

      <DialogFooter>
        <ActionButton data={{ label: 'Voltar à lista' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onCancelEdit }} />
        <ActionButton
          data={{ label: 'Salvar filtro', loadingLabel: 'Salvando…' }}
          state={{ isLoading: dialogState.isSaving }}
          actions={{ onClick: submit }}
        />
      </DialogFooter>
    {:else}
      <div class="flex flex-col gap-3">
        {#if data.filters.length === 0}
          <p class="text-ink-500 text-sm">Nenhum filtro salvo neste módulo ainda.</p>
        {:else}
          <ul class="divide-border divide-y">
            {#each data.filters as filter (filter.id)}
              <li class="flex items-center justify-between gap-3 py-2">
                <span class="min-w-0">
                  <span class="text-ink-900 block truncate text-sm font-medium">{filter.name}</span>
                  <span class="text-ink-500 block text-xs">
                    {DATA_SOURCES[filter.source].label} · {filter.scope === 'shared' ? 'Todo o módulo' : 'Só eu'}
                  </span>
                </span>
                {#if filter.canEdit}
                  <span class="flex gap-1">
                    <ActionButton data={{ label: 'Editar' }} ui={{ variant: 'ghost', size: 'sm', icon: Pencil }} actions={{ onClick: () => actions.onEdit(filter) }} />
                    <ActionButton
                      data={{ label: 'Arquivar' }}
                      ui={{ variant: 'ghost', size: 'sm', icon: Trash2 }}
                      state={{ isDisabled: dialogState.isArchiving }}
                      actions={{ onClick: () => actions.onArchive(filter.id) }}
                    />
                  </span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        {#if data.archived.length > 0}
          <ArchivedList
            data={{
              items: data.archived.map((filter) => ({
                key: filter.id,
                label: filter.name,
                kind: DATA_SOURCES[filter.source].label,
                archivedAt: filter.archive?.archivedAt ?? filter.updatedAt,
                canRestore: filter.canEdit,
              })),
            }}
            state={{ isLoading: false, restoringKey: null, error: null }}
            actions={{ onOpenChange: () => {}, onRestore: actions.onRestore }}
          />
        {/if}

        {#if dialogState.error}
          <p role="alert" class="text-destructive text-sm font-medium">{dialogState.error}</p>
        {/if}
      </div>

      <DialogFooter>
        <ActionButton data={{ label: 'Fechar' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClose }} />
        <ActionButton data={{ label: 'Novo filtro' }} ui={{ icon: Plus }} actions={{ onClick: actions.onNew }} />
      </DialogFooter>
    {/if}
  </DialogContent>
</Dialog>
