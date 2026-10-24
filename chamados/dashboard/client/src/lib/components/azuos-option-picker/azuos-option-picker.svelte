<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import { tv } from 'tailwind-variants';

  import type { StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  /**
   * Seletor dinâmico — substitui o `<select>` nativo em filtro e formulário.
   *
   * Com POUCAS opções (até 6, contando "Todos"), vira uma fileira de pastilhas: a pessoa
   * compara e troca com um clique, sem abrir nada. Com MUITAS (departamento, tipo de
   * problema...), pastilha lado a lado viraria uma parede de botões — vira um botão que abre
   * um balão com busca, como o filtro de processos do agente.
   *
   * O tom (verde, vermelho...) é decidido por QUEM CHAMA — o mesmo cuidado do `StatusBadge`,
   * para a cor de uma situação nunca variar de tela pra tela.
   */
  /** `icon` é opcional: um desenho na frente do texto, para a opção não ser só uma palavra. */
  export type OptionPickerOption = {
    value: string;
    label: string;
    tone?: StatusBadgeTone;
    icon?: LucideIcon;
    /**
     * Uma linha divisória ANTES desta opção, na lista que abre: separa um grupo do outro (os
     * departamentos do RH dos que existem só aqui). Nas pastilhas não aparece — lá as opções
     * são poucas e lado a lado, e uma linha no meio não diria nada.
     */
    separatorBefore?: boolean;
  };

  export type AzuosOptionPickerProps = {
    data: { value: string; options: OptionPickerOption[] };
    ui?: {
      ariaLabel?: string;
      className?: string;
      /** Prefixa uma opção "Todos os X", representando o valor ''. Só faz sentido em filtro. */
      allLabel?: string;
      placeholder?: string;
      /** Estica o combo até a largura do campo ao lado, como num formulário. A ALTURA não
       * depende disto: pastilha ou combo, filtro ou formulário, o controle tem sempre os 40px
       * de todo campo (`control-lg`), a mesma do `TextField`, do `SelectField` e do
       * `DatePicker`. */
      fullWidth?: boolean;
      /** Mantém a busca disponível mesmo com poucas opções. */
      mode?: 'auto' | 'combobox';
      searchPlaceholder?: string;
      /** Mostra o nome completo do item escolhido no hover e no foco do combo. */
      showSelectedTooltip?: boolean;
      /** Permite confirmar o texto da busca como valor livre, além das opções conhecidas. */
      allowCustomValue?: boolean;
      selectedLabel?: string;
    };
    state?: { isDisabled?: boolean; error?: string | null };
    actions: { onChange: (value: string) => void; onCustomValue?: (value: string) => void };
  };

  /**
   * Até quantas opções o controle é uma fileira de pastilhas; acima disso vira a lista que abre.
   *
   * Em FILTRO a barra tem a largura da tela e as pastilhas podem quebrar linha: seis ainda se
   * leem de relance. Em FORMULÁRIO (dentro de um diálogo) a largura é a de um campo, e pastilha
   * só serve enquanto cabe em UMA linha — com mais de três, elas quebram em duas ou três
   * fileiras e o campo passa a ocupar mais altura do que todos os outros juntos. Ali a lista
   * que abre escala para qualquer quantidade, e ainda tem busca.
   */
  const PILL_MAX_OPTIONS = { filter: 6, form: 3 } as const;

  /**
   * O TRILHO das pastilhas.
   *
   * A altura de campo é a do trilho inteiro (40px, com a borda e o respiro dele), não a de cada
   * pastilha: com a pastilha em 32px o trilho somava 42px e ficava mais alto que o seletor ao
   * lado. `min-h`, e não `h`: no celular as opções quebram em mais de uma linha.
   *
   * `layout` é onde o controle mora. Em FILTRO as pastilhas seguem em fileira, cada uma do
   * tamanho do próprio texto, e quebram linha em vez de rolar para o lado. Em FORMULÁRIO são
   * no máximo três (ver `PILL_MAX_OPTIONS`) e dividem a largura do campo em colunas iguais,
   * numa linha só.
   */
  const optionTrack = tv({
    base: 'items-stretch gap-1 rounded-control border border-border/70 bg-muted/50 p-1 min-h-(--control-lg) max-w-full min-w-0',
    variants: {
      layout: {
        filter: 'inline-flex flex-wrap',
        form: 'grid w-full',
      },
      /* Só vale na grade do formulário: uma coluna por opção. */
      columns: { 1: '', 2: '', 3: '' },
    },
    compoundVariants: [
      { layout: 'form', columns: 1, class: 'grid-cols-1' },
      { layout: 'form', columns: 2, class: 'grid-cols-2' },
      { layout: 'form', columns: 3, class: 'grid-cols-3' },
    ],
    defaultVariants: { layout: 'filter', columns: 3 },
  });

  /**
   * A PASTILHA. Preenche a altura do trilho (que é quem tem os 40px de campo), e o raio é
   * `box`, um degrau abaixo do `control` do trilho: filho menor que o pai.
   *
   * A cor só entra quando a pastilha está escolhida, e aí é a do tom — o mesmo cuidado do
   * `StatusBadge`, para a cor de uma situação nunca variar de tela para tela.
   */
  const optionPill = tv({
    base: 'rounded-box inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60',
    variants: {
      layout: {
        filter: '',
        /* Na grade o texto fica centrado na coluna. Sem altura mínima própria: a pastilha
           preenche o trilho, e é o trilho que tem os 40px — com um mínimo aqui ele passava a
           42px e desalinhava do seletor ao lado. */
        form: 'justify-center text-center',
      },
      isSelected: {
        true: 'shadow-xs font-semibold',
        false: 'border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground',
      },
      tone: { neutral: '', info: '', success: '', warning: '', danger: '', brand: '' },
    },
    compoundVariants: [
      {
        isSelected: true,
        tone: 'neutral',
        class: 'border-foreground bg-foreground text-background',
      },
      { isSelected: true, tone: 'info', class: 'bg-info text-primary-foreground' },
      {
        isSelected: true,
        tone: 'success',
        class: 'bg-success text-primary-foreground',
      },
      {
        isSelected: true,
        tone: 'warning',
        class: 'bg-warning text-primary-foreground',
      },
      {
        isSelected: true,
        tone: 'danger',
        class: 'bg-destructive text-destructive-foreground',
      },
      {
        isSelected: true,
        tone: 'brand',
        class: 'bg-primary text-primary-foreground',
      },
    ],
    defaultVariants: { layout: 'filter', isSelected: false, tone: 'neutral' },
  });

  /** A bolinha do tom, ao lado do texto de uma opção que não está escolhida. */
  const optionDot = tv({
    base: 'size-1.5 shrink-0 rounded-full',
    variants: {
      tone: {
        neutral: 'bg-muted-foreground',
        info: 'bg-info',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-destructive',
        brand: 'bg-primary',
      },
    },
    defaultVariants: { tone: 'neutral' },
  });

  /* Uma coluna por opção. Em formulário nunca passam de três — acima disso não há pastilhas. */
  function resolveGridColumns(count: number): 1 | 2 | 3 {
    if (count <= 1) return 1;

    return count === 2 ? 2 : 3;
  }

  function resolveOptions(
    data: AzuosOptionPickerProps['data'],
    allLabel: string | undefined,
  ): OptionPickerOption[] {
    return allLabel ? [{ value: '', label: allLabel }, ...data.options] : data.options;
  }
</script>

<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import SearchIcon from '@lucide/svelte/icons/search';

  import { Popover, PopoverTrigger } from '$lib/components/ui/popover';
  import PopoverContent from '$lib/components/azuos-search-popover-content/azuos-search-popover-content.svelte';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosOptionPickerProps = $props();

  const isMobile = new MediaQuery('(max-width: 639px)');
  let isOpen = $state(false);
  let query = $state('');
  const fieldId = $props.id();
  const errorId = `${fieldId}-error`;

  const options = $derived(resolveOptions(data, ui?.allLabel));
  const layout = $derived(ui?.fullWidth ? 'form' : 'filter');
  const isPillMode = $derived(
    !isMobile.current && !ui?.allowCustomValue && ui?.mode !== 'combobox' && options.length <= PILL_MAX_OPTIONS[layout],
  );
  const gridColumns = $derived(resolveGridColumns(options.length));
  const selectedOption = $derived(options.find((option) => option.value === data.value) ?? null);

  const selectedLabel = $derived(ui?.selectedLabel ?? selectedOption?.label ??
    (ui?.allowCustomValue && data.value ? data.value : ui?.placeholder ?? 'Selecione'));
  const customValue = $derived(ui?.allowCustomValue ? query.trim() : '');

  const filteredOptions = $derived(
    query.trim()
      ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options,
  );

  function select(value: string, custom = false): void {
    if (custom && actions.onCustomValue) actions.onCustomValue(value);
    else actions.onChange(value);
    isOpen = false;
    query = '';
  }
</script>

{#snippet comboTrigger(props: Record<string, unknown>)}
  <PopoverTrigger
    {...props}
    disabled={fieldState?.isDisabled}
    aria-label={ui?.ariaLabel}
    aria-invalid={Boolean(fieldState?.error)}
    aria-describedby={fieldState?.error ? errorId : undefined}
    class={cn(
      'control-lg',
      'rounded-control inline-flex min-w-0 max-w-full w-full cursor-pointer items-center justify-between gap-2 border border-border/70 bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60',
      ui?.fullWidth ? 'sm:w-full' : 'sm:w-auto sm:min-w-[180px]',
      ui?.className,
    )}
  >
    <span class="flex min-w-0 items-center gap-2">
      {#if selectedOption?.icon}
        <selectedOption.icon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {:else if selectedOption?.tone}
        <span class={optionDot({ tone: selectedOption.tone })} aria-hidden="true"></span>
      {/if}
      <span class="truncate">{selectedLabel}</span>
    </span>
    <ChevronDownIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
  </PopoverTrigger>
{/snippet}

{#if isPillMode}
  <!-- Grupo de botões num TRILHO só — uma pastilha ativa "flutuando" dentro de uma tira com
     fundo próprio, em vez de cada opção ser um botão bordado e solto. É o que faz ler como
     UM controle com vários estados, não uma fileira de botões separados. -->
  <div
    class={cn(optionTrack({ layout, columns: gridColumns }), ui?.className)}
    role="group"
    aria-label={ui?.ariaLabel}
  >
    {#each options as option (option.value || '__all__')}
      {@const isSelected = option.value === data.value}
      <button
        type="button"
        disabled={fieldState?.isDisabled}
        aria-pressed={isSelected}
        onclick={() => select(option.value)}
        class={optionPill({ layout, isSelected, tone: option.tone })}
      >
        {#if option.icon}
          <option.icon class="size-3.5 shrink-0" aria-hidden="true" />
        {:else if option.tone && !isSelected}
          <span class={optionDot({ tone: option.tone })} aria-hidden="true"></span>
        {/if}
        {option.label}
      </button>
    {/each}
  </div>
{:else}
  <Popover bind:open={isOpen}>
    {#if ui?.showSelectedTooltip}
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root
          disabled={isOpen || isMobile.current || !data.value || (!selectedOption && !ui?.allowCustomValue) || fieldState?.isDisabled}
        >
          <Tooltip.Trigger>
            {#snippet child({ props })}
              {@render comboTrigger(props)}
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content
            role="tooltip"
            side="top"
            sideOffset={8}
            class="max-w-[min(24rem,calc(100vw-2rem))] whitespace-normal break-words"
          >{selectedLabel}</Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {:else}
      {@render comboTrigger({})}
    {/if}
    <!-- A LARGURA DO BALÃO É AMARRADA À DO BOTÃO, entre um piso e um teto.
         Com largura fixa, ele nascia estreito sob um botão largo (e as opções saíam
         cortadas) ou largo sob um botão estreito (e o balão parecia solto, fora do lugar).
         `--bits-popover-anchor-width` é a largura do gatilho, medida pelo próprio componente:
         daí para baixo ele nunca fica menor que o botão, e o teto impede que uma opção de
         nome comprido estique o balão pela tela — a opção é cortada, não a tela. -->
    <PopoverContent
      class="min-w-(--bits-popover-anchor-width) w-auto max-w-[min(26rem,calc(100vw-2rem))] p-0"
      align="start"
    >
      <div class="relative shrink-0 border-b border-border/70 p-2">
        <SearchIcon
          class="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          bind:value={query}
          placeholder={ui?.searchPlaceholder ?? 'Buscar…'}
          aria-label={ui?.searchPlaceholder ?? 'Buscar opções'}
          class={cn(
            /* A busca do balão é um controle como os outros: degrau `sm` da régua. */
            ui?.allowCustomValue ? 'control-lg rounded-control' : 'control-sm rounded-control',
            'w-full border border-border/60 bg-muted/30 pr-2 pl-7 text-xs text-foreground outline-none',
          )}
        />
      </div>
      <!-- `overflow-x-hidden` ao lado do vertical: pelo CSS, pedir rolagem num eixo
           transforma o outro em `auto` sozinho, e uma opção de nome comprido daria barra de
           rolagem horizontal dentro do balão. -->
      <div class="min-h-0 max-h-96 overflow-x-hidden overscroll-contain overflow-y-auto p-1">
        {#each filteredOptions as option, index (option.value || '__all__')}
          {@const isSelected = option.value === data.value}
          {#if option.separatorBefore && index > 0}
            <div role="separator" class="bg-border/70 mx-2 my-1 h-px"></div>
          {/if}
          <button
            type="button"
            onclick={() => select(option.value)}
            class={cn(
              /* Item de lista dentro de um balão é MIUDEZA, não controle: raio `chip`. */
              'flex w-full cursor-pointer items-center gap-2 rounded-chip min-h-11 px-3 py-2.5 text-left text-sm transition-colors',
              isSelected
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-foreground hover:bg-muted/60',
            )}
          >
            {#if option.icon}
              <option.icon class="size-3.5 shrink-0" aria-hidden="true" />
            {:else if option.tone}
              <span class={optionDot({ tone: option.tone })} aria-hidden="true"></span>
            {/if}
            <span class="min-w-0 flex-1 break-words">{option.label}</span>
            {#if isSelected}
              <CheckIcon class="size-3.5 shrink-0" aria-hidden="true" />
            {/if}
          </button>
        {:else}
          <p class="px-2.5 py-3 text-center text-xs text-muted-foreground">Nada encontrado.</p>
        {/each}
        {#if customValue}
          <button
            type="button"
            onclick={() => select(customValue, true)}
            class="text-primary hover:bg-primary/10 flex min-h-11 w-full cursor-pointer items-center rounded-chip px-3 py-2.5 text-left text-sm font-medium break-words"
          >Usar “{customValue}”</button>
        {:else if ui?.allowCustomValue && filteredOptions.length === 0}
          <p class="px-3 pb-3 text-xs text-muted-foreground">Digite um nome na busca para usá-lo.</p>
        {/if}
      </div>
    </PopoverContent>
  </Popover>
{/if}

{#if fieldState?.error}
  <p id={errorId} role="alert" class="mt-1 text-xs text-destructive">{fieldState.error}</p>
{/if}
