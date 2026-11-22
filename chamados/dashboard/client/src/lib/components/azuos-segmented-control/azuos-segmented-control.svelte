<script lang="ts" module>
  /**
   * Um grupo de botões em que só um fica ligado — para trocar o RECORTE de uma tela ("Abertos",
   * "Resolvidos").
   *
   * Botões lado a lado, e não um select: o recorte é a primeira pergunta da tela, e as opções
   * precisam estar à vista para a pessoa saber que existem.
   *
   * O desenho é o segmentado da Trilha Azuos: um trilho no azul-claro do fundo, e a opção ligada
   * como uma "pastilha" com sombra, em azul e negrito — ligada se lê pelo relevo e pelo peso, não
   * só pela cor.
   *
   * `aria-pressed` diz ao leitor de tela qual está ligado. Em tela estreita os botões quebram
   * linha dentro do trilho, em vez de empurrar a página para o lado.
   */
  export type AzuosSegmentedControlOption = { value: string; label: string };

  export type AzuosSegmentedControlProps = {
    data: { value: string; options: AzuosSegmentedControlOption[] };
    ui: { ariaLabel: string; className?: string; variant?: 'default' | 'prominent' };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };
</script>

<script lang="ts">
  import { slidingIndicator } from '$lib/motion/sliding-indicator';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosSegmentedControlProps = $props();

  const isProminent = $derived(ui.variant === 'prominent');

  function choose(value: string) {
    if (value === data.value) return;
    actions.onChange(value);
  }
</script>

<!-- O escolhido não pinta o próprio fundo: um destaque só DESLIZA até ele, como no menu. -->
<div
  role="group"
  aria-label={ui.ariaLabel}
  use:slidingIndicator={{
    selector: '[aria-pressed="true"]',
    indicatorClass: isProminent ? 'rounded-full bg-primary' : 'rounded-full bg-segment-selected shadow-xs',
    attributes: ['aria-pressed'],
  }}
  class={cn(
    /* O trilho tem o tamanho das opções (padrão Apple), e não a largura da tela: uma pílula
       esticada com metade vazia parecia um campo. Quando não cabe (celular), rola de lado. */
    'bg-muted inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1',
    isProminent && 'w-full gap-2 bg-transparent p-0 sm:w-auto',
    ui.className,
  )}
>
  {#each data.options as option (option.value)}
    {@const isActive = option.value === data.value}
    <button
      type="button"
      aria-pressed={isActive}
      disabled={state?.isDisabled}
      onclick={() => choose(option.value)}
      class={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-[color,background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        isActive
          ? 'text-foreground font-semibold'
          : 'text-muted-foreground hover:bg-hover-veil hover:text-foreground font-medium',
        isProminent &&
          'control-lg focus-visible:outline-primary flex-auto px-5 text-base whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 sm:flex-none',
        isProminent &&
          (isActive
            ? 'text-primary-foreground shadow-none'
            : 'bg-primary/10 text-ink-900 hover:bg-primary/20 hover:text-ink-900 shadow-none'),
      )}
    >
      {option.label}
    </button>
  {/each}
</div>
