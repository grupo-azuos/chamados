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

  let { data, state: menuState, actions }: AzuosActionMenuProps = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger disabled={menuState?.isDisabled}>
    {#snippet child({ props })}
      <Button {...props} type="button" class={actionButton({ variant: 'secondary' })}>
        <Ellipsis aria-hidden="true" />
        {data.label}
      </Button>
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
