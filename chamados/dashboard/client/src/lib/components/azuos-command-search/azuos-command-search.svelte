<!--
  @component
  A BUSCA DE DENTRO DOS MENUS DE ESCOLHA (combobox): a linha de pesquisa reta, com a lupa e o fio
  embaixo, seguida da lista filtrada. Use dentro do balão de qualquer campo com busca
  (`AzuosComboboxField`, `AzuosPersonPickerField`), com as linhas em `AzuosCommandSearchItem`.

  Existe porque o `ui/command` do shadcn-svelte desenha a busca como pílula com respiro em volta e
  a lista com `rounded-xl! p-1`, sem aceitar classe que desfaça — e o template (cmdk) desenha a
  linha reta de 36px. Este componente usa as peças cruas do bits-ui com as classes do template, um
  por um, para os dois sistemas ficarem iguais. O filtro e o teclado continuam os do bits-ui.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosCommandSearchProps = {
    data: { term: string };
    ui?: {
      placeholder?: string;
      emptyLabel?: string;
      className?: string;
      /**
       * Quem usa já filtra as linhas pelo termo. O filtro do bits-ui REORDENA as linhas mexendo
       * direto na página, e uma linha que sai da lista no meio disso (o "Criar «termo»") fica órfã,
       * presa na tela com o texto velho.
       */
      isFilteredOutside?: boolean;
    };
    actions: { onTermChange: (term: string) => void };
    /** As linhas da lista (`AzuosCommandSearchItem`). */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { Command as CommandPrimitive, useId } from 'bits-ui';
  import Search from '@lucide/svelte/icons/search';

  import { cn } from '$lib/utils/cn';

  let { data, ui, actions, children }: AzuosCommandSearchProps = $props();

  /* O grupo do bits-ui precisa de um valor próprio; sem título, um id único basta (o mesmo que o
     `ui/command` faz), para o filtro nunca confundir o grupo com uma linha. */
  const groupValue = `----${useId()}`;
</script>

<CommandPrimitive.Root
  shouldFilter={!ui?.isFilteredOutside}
  data-slot="command"
  class={cn('bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md', ui?.className)}
>
  <!-- A linha de busca do template: reta, 36px, lupa à esquerda e o fio de 1px embaixo separando
       da lista. Sem pílula nem fundo próprio — o balão já é a superfície. -->
  <div data-slot="command-input-wrapper" class="flex h-9 items-center gap-2 border-b px-3">
    <Search class="size-4 shrink-0 opacity-50" aria-hidden="true" />
    <CommandPrimitive.Input
      data-slot="command-input"
      bind:value={() => data.term, actions.onTermChange}
      placeholder={ui?.placeholder ?? 'Pesquisar…'}
      class="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
    />
  </div>
  <CommandPrimitive.List
    data-slot="command-list"
    class="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto"
  >
    <CommandPrimitive.Empty data-slot="command-empty" class="py-6 text-center text-sm">
      {ui?.emptyLabel ?? 'Nada encontrado.'}
    </CommandPrimitive.Empty>
    <CommandPrimitive.Group data-slot="command-group" value={groupValue} class="text-foreground overflow-hidden p-1">
      <CommandPrimitive.GroupItems>
        {@render children?.()}
      </CommandPrimitive.GroupItems>
    </CommandPrimitive.Group>
  </CommandPrimitive.List>
</CommandPrimitive.Root>
