<!--
  @component
  O `PopoverContent` dos balões COM BUSCA (seletores e combobox), no lugar do de `ui/popover`.

  O balão fica preso à tela (`strategy="fixed"`), reposiciona sempre que a página se mexe e respeita
  a altura disponível: o campo de busca no alto fica fixo e só a lista embaixo rola.

  No celular, abrir as opções NÃO abre o teclado: o foco vai para o próprio balão, sem rolar a
  página, e o teclado só sobe quando a pessoa toca na busca. No desktop o foco vai direto para a
  busca, como sempre.

  Props: as mesmas do `PopoverContent` (`class`, `ref`, `onOpenAutoFocus`…).
-->
<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import type { ComponentProps } from 'svelte';
  import PopoverContent from '$lib/components/ui/popover/popover-content.svelte';
  import { cn } from '$lib/utils/cn';

  // Abrir opções no celular não deve abrir o teclado antes de a pessoa tocar na busca.
  let {
    ref = $bindable(null),
    class: className,
    onOpenAutoFocus,
    ...restProps
  }: ComponentProps<typeof PopoverContent> = $props();
  const isMobile = new MediaQuery('(max-width: 639px)');

  function onOpenFocus(event: Event): void {
    onOpenAutoFocus?.(event);
    if (event.defaultPrevented || !isMobile.current) return;
    event.preventDefault();
    ref?.focus({ preventScroll: true });
  }
</script>

<PopoverContent
  {...restProps}
  bind:ref
  strategy="fixed"
  updatePositionStrategy="always"
  collisionPadding={12}
  onOpenAutoFocus={onOpenFocus}
  class={cn(
    'min-h-0 max-h-[var(--bits-popover-content-available-height)] overflow-hidden gap-0',
    '[&>div:first-child]:shrink-0 [&>div:last-child]:min-h-0',
    className,
  )}
/>
