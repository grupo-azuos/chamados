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
    /**
     * Para usar a busca fora da Rastreabilidade (a movimentação de peça): o título, a explicação e
     * a opção vazia ("(Nenhuma máquina)"), que escolhe `''`.
     */
    ui?: { title?: string; description?: string; noneLabel?: string };
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

  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';

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
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { cn } from '$lib/utils/cn';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';

  let { data, ui, state: pickerState, actions }: AzuosTraceabilityPickerProps = $props();

  const text = $derived(TEXT[data.focus]);
</script>

<Dialog
  open={pickerState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-6xl">
    <DialogHeader>
      <DialogTitle>{ui?.title ?? text.title}</DialogTitle>
      <DialogDescription>{ui?.description ?? 'O mapa parte daqui: toque no card para ver o que passou por ele.'}</DialogDescription>
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
      <!-- O esqueleto tem a forma da grade de escolhas: o diálogo não pula quando ela chega. -->
      <div role="status" aria-label="Carregando…" aria-busy="true" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each [0, 1, 2, 3, 4, 5] as slot (slot)}
          <Skeleton class="rounded-box h-20 w-full" />
        {/each}
      </div>
    {:else if data.picks.length === 0 && !ui?.noneLabel}
      <EmptyState data={{ title: text.empty, description: 'Confira a busca.' }} ui={{ icon: SearchX }} />
    {:else}
      <ul class="-mx-1 grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-3" aria-label={text.title}>
        <!-- Cada escolha é o card de conteúdo da casa: o card inteiro escolhe, e o escolhido fica
             no fundo de "selecionado" (nunca borda nem pastilha pintada à mão). -->
        {#if ui?.noneLabel}
          <li class="flex">
            <ContentCard
              data={{ label: ui.noneLabel, title: ui.noneLabel }}
              ui={{ className: 'w-full', slot: 'traceability-pick' }}
              state={{ isSelected: data.selectedId === '' }}
              actions={{ onOpen: () => actions.onPick('') }}
            />
          </li>
        {/if}
        {#each data.picks as pick (pick.id)}
          <li class="flex">
            <ContentCard
              data={{
                label: pick.subtitle ? `${pick.title} — ${pick.subtitle}` : pick.title,
                title: pick.title,
                meta: [pick.subtitle, pick.detail].filter(Boolean).join(' · ') || null,
                tags:
                  pick.isOnline === undefined
                    ? []
                    : [{ label: pick.isOnline ? 'Online' : 'Offline', tone: pick.isOnline ? 'success' : null }],
              }}
              ui={{ className: 'w-full', slot: 'traceability-pick' }}
              state={{ isSelected: pick.id === data.selectedId }}
              actions={{ onOpen: () => actions.onPick(pick.id) }}
            >
              {#snippet leading()}
                {#if pick.person}
                  <PersonAvatar name={pick.person.name} avatarUrl={pick.person.photo} personId={pick.person.id} ui={{ size: 'md' }} />
                {/if}
              {/snippet}
            </ContentCard>
          </li>
        {/each}
      </ul>
    {/if}

    <DialogFooter>
      <ActionButton data={{ label: 'Cancelar' }} ui={{ variant: 'secondary' }} actions={{ onClick: actions.onClose }} />
    </DialogFooter>
  </DialogContent>
</Dialog>
