<script lang="ts" module>
  /**
   * O QUE FOI REMOVIDO — e pode voltar.
   *
   * Nada se apaga no sistema: excluir, tirar e desvincular ARQUIVAM. O arquivado some da tela, e
   * é aqui que ele aparece de novo, só quando a pessoa pede (o bloco nasce fechado). Cada linha
   * diz o que era e quando saiu, e tem o "Desfazer" — que só aparece para quem pode desfazer.
   *
   * Genérico de propósito: manutenções, inventário, orçamentos, peças, sistemas, a Agenda, a
   * equipe e a ficha do chamado mostram os removidos do mesmo jeito.
   */
  export type AzuosArchivedItem = {
    /** Único na lista, mesmo misturando tipos (`attachment:9`, `area:3`). */
    key: string;
    /** O que era — o nome do arquivo, da máquina, da pessoa, o protocolo. */
    label: string;
    /** O tipo, quando a lista mistura (`Anexo`, `Máquina`). */
    kind?: string;
    archivedAt: string;
    canRestore: boolean;
  };

  export type AzuosArchivedListProps = {
    data: { items: AzuosArchivedItem[]; title?: string };
    ui?: { className?: string };
    state: { isLoading: boolean; restoringKey: string | null; error: string | null };
    actions: {
      /** Avisa a tela que o bloco abriu — é quando ela busca os removidos. */
      onOpenChange: (isOpen: boolean) => void;
      onRestore: (key: string) => void;
    };
  };

  export const ARCHIVED_LIST_TITLE = 'Removidos';
</script>

<script lang="ts">
  import ArchiveRestore from '@lucide/svelte/icons/archive-restore';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import AzuosCollapsible from '$lib/components/azuos-collapsible/azuos-collapsible.svelte';
  import { formatDateTime } from '$lib/utils/format-date';

  let { data, ui, state: listState, actions }: AzuosArchivedListProps = $props();
</script>

<AzuosCollapsible
  data={{ title: data.title ?? ARCHIVED_LIST_TITLE }}
  ui={{ className: ui?.className }}
  actions={{ onOpenChange: actions.onOpenChange }}
>
  {#if listState.error}
    <p role="alert" class="text-destructive text-sm font-medium">{listState.error}</p>
  {:else if listState.isLoading}
    <p class="text-ink-500 text-sm">Carregando os removidos…</p>
  {:else if data.items.length === 0}
    <p class="text-ink-500 text-sm">Nada foi removido.</p>
  {:else}
    <ul class="divide-border divide-y">
      {#each data.items as item (item.key)}
        <li class="flex items-center justify-between gap-3 py-2">
          <span class="min-w-0">
            <span class="text-ink-900 block truncate text-sm">
              {#if item.kind}<span class="text-ink-500">{item.kind} · </span>{/if}{item.label}
            </span>
            <span class="text-ink-500 block text-xs">Removido em {formatDateTime(item.archivedAt)}</span>
          </span>
          {#if item.canRestore}
            <AzuosActionButton
              data={{ label: 'Desfazer', loadingLabel: 'Desfazendo…' }}
              ui={{ variant: 'secondary', size: 'sm', icon: ArchiveRestore }}
              state={{
                isLoading: listState.restoringKey === item.key,
                isDisabled: listState.restoringKey !== null,
              }}
              actions={{ onClick: () => actions.onRestore(item.key) }}
            />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</AzuosCollapsible>
