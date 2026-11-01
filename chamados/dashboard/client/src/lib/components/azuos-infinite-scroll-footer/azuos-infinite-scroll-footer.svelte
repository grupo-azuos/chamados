<script lang="ts" module>
  /**
   * O FIM DA LISTA QUE ROLA — pede a próxima página ao chegar perto dele.
   *
   * É o rodapé das listagens em TABELA. Cartão pagina com botão (`AzuosPaginationBar`); tabela
   * rola. No modo cartão a pessoa varre visualmente e quer saber onde está; na tabela ela procura
   * uma linha e rolar é o gesto natural.
   *
   * O botão "Carregar mais" continua aqui, e não é redundância: rolagem com teclado nem sempre
   * chega ao sentinela, e leitor de tela não "rola até ver". Sem o botão, quem não dispara o
   * observador fica sem caminho nenhum para o resto da lista.
   *
   * Compositor puro: recebe tudo por props e não busca nada.
   */
  export type AzuosInfiniteScrollFooterProps = {
    data: { loaded: number; totalItems: number };
    ui?: {
      /** O que está sendo contado: "de 566 chamados" em vez de "de 566". */
      itemNoun?: { singular: string; plural: string };
      className?: string;
    };
    state: { isLoading: boolean; hasMore: boolean };
    actions: { onLoadMore: () => void };
  };

  /** "chamado" ou "chamados", ou nada quando quem chama não disse o que está contando. */
  export function nounFor(total: number, noun?: { singular: string; plural: string }): string {
    if (!noun) return '';

    return total === 1 ? noun.singular : noun.plural;
  }
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { onVisible } from '$lib/hooks/use-on-visible/use-on-visible';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosInfiniteScrollFooterProps = $props();

  const word = $derived(nounFor(data.totalItems, ui?.itemNoun));
  const suffix = $derived(word ? ` ${word}` : '');
</script>

<div class={cn('mt-4 flex flex-col items-center gap-3', ui?.className)}>
  <p class="text-ink-500 text-sm" aria-live="polite">
    {state.hasMore
      ? `${data.loaded} de ${data.totalItems}${suffix}`
      : `${data.totalItems}${suffix} — fim da lista`}
  </p>
  {#if state.hasMore}
    <ActionButton
      data={{ label: 'Carregar mais', loadingLabel: 'Carregando…' }}
      ui={{ variant: 'secondary', icon: state.isLoading ? Loader2 : undefined }}
      state={{ isLoading: state.isLoading }}
      actions={{ onClick: actions.onLoadMore }}
    />
  {/if}
  <!-- O sentinela: entrar na tela é o que pede a próxima página. Fica DEPOIS do botão para que o
       `rootMargin` conte a partir do fim real do conteúdo. Desligado sem mais páginas OU enquanto
       a busca corre: sem isso, uma rolagem rápida dispara a mesma página várias vezes. -->
  <div
    use:onVisible={{ onVisible: actions.onLoadMore, isEnabled: state.hasMore && !state.isLoading }}
    aria-hidden="true"
    class="h-px w-full"
  ></div>
</div>
