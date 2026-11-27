<!--
  @component
  VINCULAR MÁQUINAS a um chamado — um diálogo grande, com a busca do Inventário, onde se marcam
  quantas máquinas forem antes de aplicar. Um atendimento pode passar por várias (o monitor trocado
  em duas mesas), e escolher uma por vez num campo estreito não dava.

  Nada é gravado ao marcar: a escolha é um rascunho, e só "Aplicar" a envia. Cancelar desfaz.

  Função pura de props: a lista já chega filtrada, e a escolha vive no view-model. `data` leva as
  máquinas, os ids marcados, a busca, o departamento e a lista de departamentos; `state`, `isOpen`,
  `isLoading`, `isSaving` e `error`; `actions`, buscar, filtrar por departamento, marcar, limpar a
  escolha, aplicar e fechar.
-->
<script lang="ts" module>
  /** Uma máquina como o diálogo a mostra — o bastante para reconhecê-la de relance. */
  export type TicketComputerChoice = {
    id: number;
    /** O nome de tela (apelido, ou o nome do Windows quando não há apelido). */
    label: string;
    /** O nome do Windows — o que vem na etiqueta da máquina. */
    hostname: string;
    responsibleName: string | null;
    /** O departamento como a tela o escreve. */
    department: string | null;
    /** O departamento como o filtro o compara: o id do RH, como texto. */
    departmentKey?: string | null;
    isOnline: boolean;
  };

  export type AzuosTicketComputersDialogProps = {
    data: {
      computers: TicketComputerChoice[];
      selectedIds: number[];
      search: string;
      department: string;
      /** Os oficiais do RH (pelo id) e, depois da linha divisória, os locais fixos. */
      departments: { value: string; label: string; separatorBefore?: boolean }[];
    };
    state?: {
      isOpen?: boolean;
      isLoading?: boolean;
      isSaving?: boolean;
      error?: string | null;
    };
    actions: {
      onSearch: (value: string) => void;
      onDepartmentChange: (value: string) => void;
      onToggle: (id: number) => void;
      onClearSelection: () => void;
      onApply: () => void;
      onClose: () => void;
    };
  };

  /** "2 máquinas selecionadas" — o rodapé diz quanto vai ser aplicado. */
  export function selectionLabel(count: number): string {
    if (count === 0) return 'Nenhuma máquina selecionada';

    return count === 1 ? '1 máquina selecionada' : `${count} máquinas selecionadas`;
  }
</script>

<script lang="ts">
  import LaptopIcon from '@lucide/svelte/icons/laptop';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: dialogState, actions }: AzuosTicketComputersDialogProps = $props();

  const isBusy = $derived(Boolean(dialogState?.isSaving));
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-6xl">
    <DialogHeader>
      <DialogTitle>Máquinas do chamado</DialogTitle>
      <DialogDescription>
        Marque todas as máquinas deste atendimento e aplique. Nada muda antes de aplicar.
      </DialogDescription>
    </DialogHeader>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_16rem]">
      <TextField
        data={{
          label: 'Buscar',
          name: 'computerSearch',
          value: data.search,
          placeholder: 'Nome da máquina, apelido ou responsável',
        }}
        actions={{ onChange: actions.onSearch }}
      />
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
    </div>

    <!-- Estados na frente, conteúdo por último (CONTRIBUTING §2). -->
    {#if dialogState?.isLoading}
      <div class="flex flex-col gap-2" aria-busy="true" aria-label="Carregando as máquinas">
        {#each [0, 1, 2, 3] as index (index)}
          <Skeleton class="h-12 w-full" />
        {/each}
      </div>
    {:else if data.computers.length === 0}
      <EmptyState
        data={{
          title: 'Nenhuma máquina encontrada',
          description: 'Confira a busca ou o departamento escolhido.',
        }}
        ui={{ icon: LaptopIcon }}
      />
    {:else}
      <!-- Uma caixa de marcar por máquina (a da casa), em lista com divisória: dentro do diálogo,
           card seria card dentro de card. A situação de rede vai no selo ao lado. -->
      <ul
        class="divide-border grid max-h-[55vh] grid-cols-1 divide-y overflow-y-auto md:grid-cols-2 md:gap-x-6"
        aria-label="Máquinas do inventário"
      >
        {#each data.computers as computer (computer.id)}
          {@const isSelected = data.selectedIds.includes(computer.id)}
          <li class="flex items-center justify-between gap-3 px-1 py-1">
            <CheckboxField
              data={{
                label: computer.label,
                name: `ticketComputer${computer.id}`,
                isChecked: isSelected,
                description: [computer.hostname, computer.responsibleName ?? 'Sem responsável', computer.department]
                  .filter(Boolean)
                  .join(' · '),
              }}
              ui={{ className: 'min-w-0' }}
              state={{ isDisabled: isBusy }}
              actions={{ onChange: () => actions.onToggle(computer.id) }}
            />
            <StatusBadge
              data={{ label: computer.isOnline ? 'Online' : 'Offline' }}
              ui={{ tone: computer.isOnline ? 'success' : 'neutral', size: 'sm' }}
            />
          </li>
        {/each}
      </ul>
    {/if}

    {#if dialogState?.error}
      <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
    {/if}

    <DialogFooter class="items-center gap-2 sm:justify-between">
      <p class="text-ink-700 text-sm font-medium" role="status">
        {selectionLabel(data.selectedIds.length)}
        {#if data.selectedIds.length > 0}
          <ActionButton
            data={{ label: 'Limpar' }}
            ui={{ variant: 'ghost', size: 'sm', className: 'ml-2' }}
            actions={{ onClick: actions.onClearSelection }}
          />
        {/if}
      </p>
      <div class="flex gap-2">
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: isBusy }}
          actions={{ onClick: actions.onClose }}
        />
        <ActionButton
          data={{ label: 'Aplicar', loadingLabel: 'Aplicando…' }}
          state={{ isLoading: isBusy }}
          actions={{ onClick: actions.onApply }}
        />
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
