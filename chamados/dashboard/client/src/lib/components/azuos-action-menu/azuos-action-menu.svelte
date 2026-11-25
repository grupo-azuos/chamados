<!--
  @component
  O menu de ações secundárias: um botão cinza com os três pontinhos e o rótulo, que abre a lista
  de ações alinhada à direita, com navegação por teclado.

  Cada item pode ter ícone, ser destrutivo (em vermelho) e ter um separador antes. Escolher um
  item só avisa a tela pelo `id`: a confirmação, quando a ação pede uma, fica a cargo de quem usa.

  - `data.label` e `data.items`: o texto do botão e as ações.
  - `ui.isIconOnly`: só os três pontinhos, sem o rótulo à vista (o rótulo vira o nome acessível)
    — é o menu da linha de tabela, onde a ação não pode ocupar uma coluna inteira.
  - `state.isDisabled`: trava o botão.
  - `actions.onSelect(id)`: a ação escolhida.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /** Ações secundárias em um menu com navegação por teclado e confirmação a cargo da tela. */
  export type AzuosActionMenuProps = {
    data: {
      label: string;
      items: {
        id: string;
        label: string;
        icon?: LucideIcon;
        isDestructive?: boolean;
        separatorBefore?: boolean;
      }[];
    };
    /** `isIconOnly`: só os três pontinhos — o menu da linha de tabela. */
    ui?: { isIconOnly?: boolean };
    state?: { isDisabled?: boolean };
    actions: { onSelect: (id: string) => void };
  };
</script>

<script lang="ts">
  import Ellipsis from '@lucide/svelte/icons/ellipsis';

  import {
    actionButton,
    AzuosButtonPrimitive as Button,
    AzuosDropdownMenuPrimitive as DropdownMenu,
  } from '$lib/components/azuos-action-button/azuos-action-button.svelte';

  let { data, ui, state: menuState, actions }: AzuosActionMenuProps = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger disabled={menuState?.isDisabled}>
    {#snippet child({ props })}
      {#if ui?.isIconOnly}
        <Button
          {...props}
          type="button"
          aria-label={data.label}
          class={actionButton({ variant: 'ghost', size: 'sm', isIconOnly: true })}
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      {:else}
        <Button {...props} type="button" class={actionButton({ variant: 'secondary' })}>
          <Ellipsis aria-hidden="true" />
          {data.label}
        </Button>
      {/if}
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="rounded-surface w-56 max-w-[calc(100vw-2rem)] p-1.5 shadow-xl">
    {#each data.items as item (item.id)}
      {#if item.separatorBefore}
        <DropdownMenu.Separator />
      {/if}
      <DropdownMenu.Item
        variant={item.isDestructive ? 'destructive' : 'default'}
        class="rounded-chip min-h-10 cursor-pointer gap-2 px-3 py-2"
        onSelect={() => actions.onSelect(item.id)}
      >
        {#if item.icon}
          {@const Icon = item.icon}
          <Icon aria-hidden="true" />
        {/if}
        <span class="break-words">{item.label}</span>
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
