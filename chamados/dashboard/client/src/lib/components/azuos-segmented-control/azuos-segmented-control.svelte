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
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosSegmentedControlProps = $props();

  const isProminent = $derived(ui.variant === 'prominent');

  function choose(value: string) {
    if (value === data.value) return;
    actions.onChange(value);
  }
</script>

<div
  role="group"
  aria-label={ui.ariaLabel}
  class={cn(
    'bg-mantle rounded-surface flex flex-wrap gap-1 p-1',
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
        'rounded-control min-h-10 px-3 text-sm transition-[color,background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        isActive
          ? 'text-primary bg-card font-bold shadow-xs'
          : 'text-muted-foreground hover:text-foreground hover:bg-card font-semibold',
        isProminent &&
          'control-lg focus-visible:outline-primary flex-auto px-5 text-base whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 sm:flex-none',
        isProminent &&
          (isActive
            ? 'bg-primary text-primary-foreground shadow-none'
            : 'bg-primary-soft text-ink-900 hover:bg-primary-soft hover:text-ink-900 shadow-none'),
      )}
    >
      {option.label}
    </button>
  {/each}
</div>
