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
    ui?: { placeholder?: string; ariaLabel?: string; className?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };

  const EMPTY_VALUE = '__empty__';
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
       só dele (menor que o dos vizinhos), destoando de tudo em volta.

       `max-w-full`: sem ele, uma opção de nome longo faz o gatilho crescer além do espaço que
       ele tem e empurra a largura de quem está em volta. `min-w-40` é o piso: abaixo de 10rem o
       gatilho cortava o próprio valor. O fundo sólido (`bg-muted`) repete no `dark:` para vencer
       o `dark:bg-input/30` do `ui/select`. -->
  <SelectTrigger
    aria-label={ui?.ariaLabel}
    title={selectedLabel || undefined}
    class={cn(
      'control-lg rounded-control border-input bg-muted dark:bg-muted dark:hover:bg-muted text-foreground max-w-full min-w-40 text-sm',
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
       é a largura do gatilho, medida pelo próprio componente. -->
  <SelectContent
    class="min-w-[max(16rem,var(--bits-select-anchor-width))] w-auto max-w-[min(26rem,calc(100vw-2rem))]"
  >
    {#each data.options as option (option.value || EMPTY_VALUE)}
      <SelectItem value={option.value || EMPTY_VALUE} label={option.label}>
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
