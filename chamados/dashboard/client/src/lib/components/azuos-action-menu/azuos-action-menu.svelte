<!--
  @component
  O menu de ações secundárias: um botão cinza com os três pontinhos e o rótulo, que abre a lista
  de ações centralizada embaixo do botão, com navegação por teclado.

  Cada item pode ter ícone, ser destrutivo (em vermelho), ter um separador antes, estar travado
  (`isDisabled`) ou ser um LINK (`href`): "Ver chamado", "Abrir no portal". O link é um `<a>` de
  verdade dentro do item — abre com o botão do meio, copia o endereço, e o leitor de tela diz
  "link". Escolher um item comum só avisa a tela pelo `id`: a confirmação, quando a ação pede uma,
  fica a cargo de quem usa.

  - `data.label` e `data.items`: o texto do botão e as ações.
  - `ui.isIconOnly`: só os três pontinhos, sem o rótulo à vista — o rótulo vira o nome acessível e
    a dica do balão. É o menu da LINHA DE TABELA e do card: ali a ação nunca é botão com texto,
    que corta e alarga a coluna.
  - `state.isDisabled`: trava o botão.
  - `actions.onSelect(id)`: a ação escolhida (o link não chama: ele navega).

  O clique e a tecla no menu NÃO chegam a quem está por baixo: a linha e o card clicáveis abriam
  a edição junto com o menu.
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
        /** O item travado: aparece, mas não se escolhe (a ação já está em andamento). */
        isDisabled?: boolean;
        /** O item é um link: navega para cá em vez de avisar `onSelect`. */
        href?: string;
        /** `_blank`: o link abre em outra aba (com `noopener`). */
        target?: '_blank';
      }[];
    };
    /** `isIconOnly`: só os três pontinhos — o menu da linha de tabela e do card. */
    ui?: { isIconOnly?: boolean; className?: string };
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
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: menuState, actions }: AzuosActionMenuProps = $props();

  /** Segura o evento no menu: a linha ou o card de baixo não reage ao clique que era do menu. */
  function stop(event: Event) {
    event.stopPropagation();
  }

  /* Os eventos do gatilho, encadeados: o do menu (e do balão) corre, e depois o evento para aqui. */
  function chained(props: Record<string, unknown>) {
    const call = (name: string, event: Event) =>
      (props[name] as ((event: Event) => void) | undefined)?.(event);

    return {
      ...props,
      onclick: (event: Event) => {
        call('onclick', event);
        stop(event);
      },
      onpointerdown: (event: Event) => {
        call('onpointerdown', event);
        stop(event);
      },
      onkeydown: (event: Event) => {
        call('onkeydown', event);
        stop(event);
      },
    };
  }

  const ITEM_CLASS = 'rounded-control min-h-10 cursor-pointer gap-2 px-3 py-2';
</script>

<DropdownMenu.Root>
  {#if ui?.isIconOnly}
    <!-- Só ícone: um quadrado da régua com os três pontinhos CENTRADOS, que não encolhe na coluna
         estreita — encolhido, o círculo do hover ficava oval e os pontinhos saíam do meio. O nome
         vai no `aria-label` e no balão. -->
    <!-- `ignoreNonKeyboardFocus`: o foco que o diálogo põe sozinho no botão não abre o balão. -->
    <Tooltip.Provider delayDuration={300} ignoreNonKeyboardFocus>
      <Tooltip.Root disabled={menuState?.isDisabled}>
        <Tooltip.Trigger>
          {#snippet child({ props: tooltipProps })}
            <DropdownMenu.Trigger {...tooltipProps} disabled={menuState?.isDisabled}>
              {#snippet child({ props })}
                <Button
                  {...chained(props)}
                  type="button"
                  aria-label={data.label}
                  class={actionButton({
                    variant: 'ghost',
                    size: 'sm',
                    isIconOnly: true,
                    class: cn('inline-flex shrink-0 items-center justify-center', ui?.className),
                  })}
                >
                  <Ellipsis aria-hidden="true" class="size-4 shrink-0" />
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>{data.label}</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  {:else}
    <DropdownMenu.Trigger disabled={menuState?.isDisabled}>
      {#snippet child({ props })}
        <Button
          {...chained(props)}
          type="button"
          class={actionButton({
            variant: 'secondary',
            class: cn('inline-flex items-center gap-2 px-4 text-sm', ui?.className),
          })}
        >
          <Ellipsis aria-hidden="true" class="size-4 shrink-0" />
          {data.label}
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
  {/if}
  <DropdownMenu.Content
    align="center"
    onclick={stop}
    onkeydown={stop}
    class="rounded-surface bg-popover ring-foreground/8 w-max max-w-[min(26rem,calc(100vw-2rem))] min-w-[max(14rem,var(--bits-dropdown-menu-anchor-width))] border-transparent p-1.5 shadow-xl ring-1"
  >
    {#each data.items as item (item.id)}
      {#if item.separatorBefore}
        <DropdownMenu.Separator />
      {/if}
      {#if item.href}
        <DropdownMenu.Item disabled={item.isDisabled} class={ITEM_CLASS}>
          {#snippet child({ props })}
            <a
              {...props}
              href={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            >
              {@render entry(item)}
            </a>
          {/snippet}
        </DropdownMenu.Item>
      {:else}
        <DropdownMenu.Item
          variant={item.isDestructive ? 'destructive' : 'default'}
          disabled={item.isDisabled}
          class={ITEM_CLASS}
          onSelect={() => actions.onSelect(item.id)}
        >
          {@render entry(item)}
        </DropdownMenu.Item>
      {/if}
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>

<!-- O ícone e o texto do item, iguais no item comum e no link. -->
{#snippet entry(item: AzuosActionMenuProps['data']['items'][number])}
  {#if item.icon}
    {@const Icon = item.icon}
    <Icon aria-hidden="true" />
  {/if}
  <span class="break-words">{item.label}</span>
{/snippet}
