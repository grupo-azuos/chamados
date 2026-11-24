<!--
  @component
  ESCOLHER O PONTO DE PARTIDA da Rastreabilidade — a busca de "Máquinas do chamado": o "Buscar"
  grande, o departamento ao lado e os cards (nome, linha de apoio, responsável · departamento, e
  online ou offline na máquina; a foto na pessoa). Um toque no card escolhe e fecha.

  - `data`: `focus` (computador, departamento ou pessoa), `picks` (já filtradas), `selectedId`,
    `search`, `department`, `departments` e, na pessoa, `personScope` ("Responsáveis por PC" ou
    "Todo o escritório": o responsável pela máquina pode não ter acesso ao Chamados).
  - `state`: `isOpen`, `isLoading`.
  - `actions`: `onSearch`, `onDepartmentChange`, `onPick`, `onClose`.
-->
<script lang="ts" module>
  import { type TraceabilityFocus } from '@template/shared/schemas/traceability.schema';

  import { type TraceabilityPick } from '$lib/utils/traceability-pick.util';

  export type AzuosTraceabilityPickerProps = {
    data: {
      focus: TraceabilityFocus;
      picks: TraceabilityPick[];
      selectedId: string;
      search: string;
      department: string;
      departments: { value: string; label: string }[];
      /** Na pessoa: só quem responde por PC (o padrão), ou todo o escritório. */
      personScope?: 'responsibles' | 'all';
    };
    state?: { isOpen?: boolean; isLoading?: boolean };
    actions: {
      onSearch: (value: string) => void;
      onDepartmentChange: (value: string) => void;
      onPersonScopeChange?: (scope: 'responsibles' | 'all') => void;
      onPick: (id: string) => void;
      onClose: () => void;
    };
  };

  const PERSON_SCOPES = [
    { value: 'responsibles', label: 'Responsáveis por PC' },
    { value: 'all', label: 'Todo o escritório' },
  ];

  const TEXT: Record<TraceabilityFocus, { title: string; placeholder: string; empty: string }> = {
    computer: {
      title: 'Escolha o computador',
      placeholder: 'Nome da máquina, apelido ou responsável',
      empty: 'Nenhuma máquina encontrada',
    },
    department: { title: 'Escolha o departamento', placeholder: 'Nome do departamento', empty: 'Nenhum departamento encontrado' },
    person: { title: 'Escolha a pessoa', placeholder: 'Nome da pessoa', empty: 'Ninguém com esse nome' },
  };
</script>

<script lang="ts">
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: pickerState, actions }: AzuosTraceabilityPickerProps = $props();

  const text = $derived(TEXT[data.focus]);
</script>

<Dialog
  open={pickerState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-6xl">
    <DialogHeader>
      <DialogTitle>{text.title}</DialogTitle>
      <DialogDescription>O mapa parte daqui: toque no card para ver o que passou por ele.</DialogDescription>
    </DialogHeader>

    <div class={cn('grid grid-cols-1 gap-3', data.focus !== 'department' && 'md:grid-cols-[1fr_auto]')}>
      <TextField
        data={{ label: 'Buscar', name: 'traceabilitySearch', value: data.search, placeholder: text.placeholder }}
        actions={{ onChange: actions.onSearch }}
      />
      {#if data.focus === 'computer'}
        <FilterField data={{ label: 'Departamento' }}>
          <OptionPicker
            data={{ value: data.department, options: data.departments }}
            ui={{
              ariaLabel: 'Departamento',
              allLabel: 'Todos os departamentos',
              fullWidth: true,
              mode: 'combobox',
              searchPlaceholder: 'Buscar departamento…',
            }}
            actions={{ onChange: actions.onDepartmentChange }}
          />
        </FilterField>
      {/if}
      {#if data.focus === 'person'}
        <FilterField data={{ label: 'Mostrar' }}>
          <SegmentedControl
            data={{ value: data.personScope ?? 'responsibles', options: PERSON_SCOPES }}
            ui={{ ariaLabel: 'Mostrar' }}
            actions={{ onChange: (value) => actions.onPersonScopeChange?.(value as 'responsibles' | 'all') }}
          />
        </FilterField>
      {/if}
    </div>

    {#if pickerState?.isLoading}
      <p class="text-muted-foreground py-10 text-center text-sm">Carregando…</p>
    {:else if data.picks.length === 0}
      <EmptyState data={{ title: text.empty, description: 'Confira a busca.' }} ui={{ icon: SearchX }} />
    {:else}
      <ul class="-mx-1 grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-3" aria-label={text.title}>
        {#each data.picks as pick (pick.id)}
          {@const isSelected = pick.id === data.selectedId}
          <li>
            <!-- Os cards cinza de "Máquinas do chamado": o escolhido na cor cheia, nunca borda. -->
            <button
              type="button"
              aria-pressed={isSelected}
              onclick={() => actions.onPick(pick.id)}
              class={cn(
                'rounded-box relative isolate flex w-full cursor-pointer items-start gap-3 p-4 text-left transition-colors',
                'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-box hover:before:bg-hover-veil',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
              )}
            >
              {#if pick.person}
                <PersonAvatar name={pick.person.name} avatarUrl={pick.person.photo} personId={pick.person.id} ui={{ size: 'md' }} />
              {/if}
              <span class="flex min-w-0 flex-1 flex-col gap-1">
                <span class="block truncate text-sm font-semibold">{pick.title}</span>
                {#if pick.subtitle}
                  <span class={cn('block truncate text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                    {pick.subtitle}
                  </span>
                {/if}
                {#if pick.detail || pick.isOnline !== undefined}
                  <span class="flex flex-wrap items-center gap-2 text-xs">
                    {#if pick.detail}
                      <span class={isSelected ? 'text-primary-foreground/90' : 'text-ink-700'}>{pick.detail}</span>
                    {/if}
                    {#if pick.isOnline !== undefined}
                      <StatusBadge
                        data={{ label: pick.isOnline ? 'Online' : 'Offline' }}
                        ui={{
                          tone: pick.isOnline ? 'success' : 'neutral',
                          size: 'sm',
                          className: isSelected ? 'bg-primary-foreground text-primary' : undefined,
                        }}
                      />
                    {/if}
                  </span>
                {/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <DialogFooter>
      <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClose }} />
    </DialogFooter>
  </DialogContent>
</Dialog>
