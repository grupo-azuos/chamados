<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * Campo de seleção — o mesmo em filtro e em formulário.
   *
   * O `EMPTY_VALUE` abaixo resolve um conflito entre duas regras: para o sistema, "nenhum
   * filtro" é a string vazia; para o componente baixado, valor vazio significa "nada
   * selecionado", e ele então mostra o placeholder em vez da opção "Todos". Traduzir a
   * string vazia para uma sentinela na entrada e de volta na saída mantém a opção visível
   * sem contaminar o contrato de quem usa o campo, que continua recebendo `''`.
   */
  /** `icon` é opcional: um desenho na frente do texto, no gatilho e em cada linha da lista. */
  export type SelectFieldOption = {
    value: string;
    label: string;
    icon?: LucideIcon;
    /** A pessoa da opção: quando existe, a foto (ou as iniciais) vem antes do rótulo. */
    personName?: string;
    /** A foto da pessoa. Sem ela, ficam as iniciais de `personName`. */
    avatarUrl?: string | null;
  };

  export type AzuosSelectFieldProps = {
    data: { value: string; options: SelectFieldOption[] };
    ui?: {
      placeholder?: string;
      ariaLabel?: string;
      className?: string;
      /** A frase da lista sem opções (padrão: "Nenhuma opção disponível"). */
      noOptionsLabel?: string;
    };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };

  const EMPTY_VALUE = '__empty__';
  const NO_OPTIONS_LABEL = 'Nenhuma opção disponível';
</script>

<script lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosSelectFieldProps = $props();

  const selectedValue = $derived(data.value === '' ? EMPTY_VALUE : data.value);

  /**
   * O RÓTULO DO VALOR ESCOLHIDO, resolvido aqui.
   *
   * O `Select.Value` do componente baixado resolve o rótulo a partir das opções que já
   * foram montadas — e elas só montam quando a lista abre. Antes disso ele mostrava o valor
   * cru: a tela nascia escrevendo "network" e "medium" no lugar de "Internet / Rede" e
   * "Média", e o texto só virava português depois que a pessoa abrisse a lista.
   *
   * Procurar na própria lista de opções não depende de nada ter sido montado, então o
   * rótulo certo aparece já na primeira pintura.
   */
  const selectedOption = $derived(
    data.options.find((option) => (option.value || EMPTY_VALUE) === selectedValue),
  );
  const selectedLabel = $derived(selectedOption?.label ?? '');
</script>

<Select
  type="single"
  value={selectedValue}
  onValueChange={(val: string | undefined) => {
    if (val !== undefined) {
      actions.onChange(val === EMPTY_VALUE ? '' : val);
    }
  }}
  disabled={state?.isDisabled}
>
  <!-- O degrau `lg` da RÉGUA DE MEDIDAS (`lib/theme/tokens.css`): este campo fica sempre ao
       lado de um `TextField` ou dentro de um formulário, e vinha 4px mais baixo e com um raio
       só dele (menor que o dos vizinhos), destoando de tudo em volta. A altura vai repetida na
       variante do tamanho: o `data-[size=default]:h-9` do `ui/select` é mais específico que o
       `control-lg` e ganhava — o campo ficava com 36px, e na peça do filtro (40px) sobrava uma
       faixa embaixo que o hover não pintava.

       `max-w-full`: sem ele, uma opção de nome longo faz o gatilho crescer além do espaço que
       ele tem e empurra a largura de quem está em volta. `min-w-40` é o piso: abaixo de 10rem o
       gatilho cortava o próprio valor. O fundo sólido (`bg-muted`) repete no `dark:` para vencer
       o `dark:bg-input/30` do `ui/select`. -->
  <SelectTrigger
    aria-label={ui?.ariaLabel}
    title={selectedLabel || undefined}
    class={cn(
      'control-lg rounded-control border-input bg-muted dark:bg-muted dark:hover:bg-muted text-foreground max-w-full min-w-40 text-sm data-[size=default]:h-(--control-lg)',
      ui?.className,
    )}
  >
    <!-- `data-slot="select-value"` mantém o recorte de uma linha que o gatilho aplica ao
         filho. O tom de "nada escolhido" continua vindo do próprio gatilho, que recebe
         `data-placeholder` do componente baixado. -->
    <span data-slot="select-value" class="flex min-w-0 items-center gap-2">
      {#if selectedOption?.personName}
        <span aria-hidden="true" class="flex shrink-0">
          <PersonAvatar name={selectedOption.personName} avatarUrl={selectedOption.avatarUrl} ui={{ size: 'sm' }} />
        </span>
      {:else if selectedOption?.icon}
        <selectedOption.icon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
      {/if}
      <span class="truncate">{selectedLabel || (ui?.placeholder ?? '')}</span>
    </span>
  </SelectTrigger>
  <!-- A LARGURA DA LISTA É AMARRADA À DO GATILHO, entre um piso e um teto.
       Sem isso ela se estica até o nome mais comprido da lista: com apelidos como
       "Paralegal — estação compartilhada do corredor (PARALEGAL-08-…)", a lista nascia mais
       larga do que o diálogo inteiro e vazava pelos dois lados. `--bits-select-anchor-width`
       é a largura do gatilho, medida pelo próprio componente: a lista tem a largura do
       conteúdo (`w-max`), nunca mais estreita que o gatilho, e abre centralizada embaixo dele. -->
  <SelectContent
    align="center"
    sideOffset={6}
    class="rounded-surface bg-popover ring-foreground/8 w-max max-w-[min(26rem,calc(100vw-2rem))] min-w-(--bits-select-anchor-width) border-transparent shadow-xl ring-1"
  >
    <!-- A lista vazia diz por quê, em texto solto — não é uma opção, não dá para escolher. Sem
         isso o balão abria em branco e parecia travado. -->
    {#if data.options.length === 0}
      <p class="text-muted-foreground px-2 py-1.5 text-sm">{ui?.noOptionsLabel ?? NO_OPTIONS_LABEL}</p>
    {/if}
    {#each data.options as option (option.value || EMPTY_VALUE)}
      <SelectItem value={option.value || EMPTY_VALUE} label={option.label} class="rounded-chip">
        {#if option.personName}
          <span aria-hidden="true" class="flex shrink-0">
            <PersonAvatar name={option.personName} avatarUrl={option.avatarUrl} ui={{ size: 'sm' }} />
          </span>
        {:else if option.icon}
          <option.icon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
        {/if}
        <span class="truncate">{option.label}</span>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
