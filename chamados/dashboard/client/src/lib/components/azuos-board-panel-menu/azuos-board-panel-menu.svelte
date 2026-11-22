<!--
  @component
  O MENU DO BLOCO, como o do título de um painel do Grafana: Ver (o bloco na tela cheia), Editar,
  Duplicar e Remover. Quem só vê o painel tem só o "Ver"; editar, duplicar e remover aparecem
  para quem pode montar — e mexer num bloco já abre a montagem do painel.

  - `data`: o título do bloco (dá nome ao botão para o leitor de tela).
  - `state`: `canEdit`.
  - `actions`: `onView`, `onEdit`, `onDuplicate` e `onRemove`.
-->
<script lang="ts" module>
  export type AzuosBoardPanelMenuProps = {
    data: { title: string };
    state?: { canEdit?: boolean };
    actions: {
      onView: () => void;
      onEdit?: () => void;
      onDuplicate?: () => void;
      onRemove?: () => void;
    };
  };
</script>

<script lang="ts">
  import Copy from '@lucide/svelte/icons/copy';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import {
    actionButton,
    AzuosButtonPrimitive as Button,
    AzuosDropdownMenuPrimitive as DropdownMenu,
  } from '$lib/components/azuos-action-button/azuos-action-button.svelte';

  let { data, state: menuState, actions }: AzuosBoardPanelMenuProps = $props();

  const canEdit = $derived(Boolean(menuState?.canEdit));
  const ITEM_CLASS = 'rounded-chip min-h-10 cursor-pointer gap-2 px-3 py-2';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} type="button" aria-label={`Menu de ${data.title}`} class={actionButton({ variant: 'ghost', size: 'lg' })}>
        <EllipsisVertical aria-hidden="true" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="rounded-surface w-52 max-w-[calc(100vw-2rem)] p-1.5 shadow-xl">
    <DropdownMenu.Item class={ITEM_CLASS} onSelect={actions.onView}>
      <Maximize2 aria-hidden="true" />
      Ver
    </DropdownMenu.Item>
    {#if canEdit && actions.onEdit}
      <DropdownMenu.Item class={ITEM_CLASS} onSelect={actions.onEdit}>
        <Pencil aria-hidden="true" />
        Editar
      </DropdownMenu.Item>
    {/if}
    {#if canEdit && actions.onDuplicate}
      <DropdownMenu.Item class={ITEM_CLASS} onSelect={actions.onDuplicate}>
        <Copy aria-hidden="true" />
        Duplicar
      </DropdownMenu.Item>
    {/if}
    {#if canEdit && actions.onRemove}
      <DropdownMenu.Separator />
      <DropdownMenu.Item variant="destructive" class={ITEM_CLASS} onSelect={actions.onRemove}>
        <Trash2 aria-hidden="true" />
        Remover
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
