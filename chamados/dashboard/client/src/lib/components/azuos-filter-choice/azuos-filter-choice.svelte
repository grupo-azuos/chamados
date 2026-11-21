<script lang="ts" module>
  /**
   * UM FILTRO COM AS OPÇÕES À VISTA — o outro jeito de escolher "um entre vários", quando a lista
   * suspensa esconderia o que importa. Três desenhos, escolhidos por quem monta o painel:
   *
   * - **Etiquetas** — as opções lado a lado; a escolhida, na cor cheia da marca.
   * - **Lista aberta** — uma opção por linha, com o visto na escolhida; lê de cima a baixo.
   * - **Fotos** — só os rostos (o nome aparece ao passar o mouse); para o filtro de pessoa.
   *
   * Clicar na escolhida de novo NÃO desmarca: "Todos" é uma opção como as outras, e é ela que
   * limpa. Assim um clique a mais nunca some com o filtro sem a pessoa ver.
   */
  export type AzuosFilterChoiceOption = {
    value: string;
    label: string;
    /** A pessoa da opção: com ela, a foto (ou as iniciais) vem antes do nome. */
    personName?: string;
    avatarUrl?: string | null;
  };

  export type AzuosFilterChoiceProps = {
    data: { label: string; value: string; options: AzuosFilterChoiceOption[] };
    ui: { display: 'chips' | 'list' | 'avatars' };
    actions: { onChange: (value: string) => void };
  };

  /** Escolhida: a cor cheia da marca. As outras: o fundo neutro, que realça no mouse. */
  export function optionTone(display: AzuosFilterChoiceProps['ui']['display'], isChecked: boolean): string {
    if (isChecked) return 'bg-primary text-primary-foreground';
    if (display === 'list') return 'text-foreground hover:bg-accent';

    return 'bg-muted text-foreground hover:bg-accent';
  }
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';

  import AzuosFilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import AzuosPersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cn } from '$lib/utils/cn';

  let { data, ui, actions }: AzuosFilterChoiceProps = $props();
</script>

<AzuosFilterField data={{ label: data.label }} ui={{ className: 'w-full' }}>
  <div
    role="radiogroup"
    aria-label={data.label}
    class={ui.display === 'list'
      ? 'rounded-control bg-muted flex max-h-56 flex-col gap-0.5 overflow-y-auto p-1'
      : 'flex max-h-40 flex-wrap gap-1.5 overflow-y-auto'}
  >
    {#each data.options as option (option.value)}
      {@const isChecked = option.value === data.value}
      {#if ui.display === 'avatars' && option.personName}
        <!-- Só o rosto; a escolhida ganha o fundo na cor da marca em volta, e as outras ficam
             apagadas. -->
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  role="radio"
                  aria-checked={isChecked}
                  aria-label={option.label}
                  onclick={() => actions.onChange(option.value)}
                  class={cn(
                    'control-icon-lg focus-visible:ring-ring/50 flex items-center justify-center rounded-full transition focus-visible:ring-[3px] focus-visible:outline-none',
                    isChecked ? 'bg-primary' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <AzuosPersonAvatar name={option.personName ?? option.label} avatarUrl={option.avatarUrl} ui={{ size: 'md' }} />
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content>{option.label}</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {:else}
        <button
          type="button"
          role="radio"
          aria-checked={isChecked}
          onclick={() => actions.onChange(option.value)}
          class={cn(
            'focus-visible:ring-ring/50 flex shrink-0 items-center gap-2 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
            ui.display === 'list' ? 'control-md rounded-control w-full px-3 text-left' : 'control-md rounded-chip px-3',
            optionTone(ui.display, isChecked),
          )}
        >
          {#if option.personName}
            <AzuosPersonAvatar name={option.personName} avatarUrl={option.avatarUrl} ui={{ size: 'sm' }} />
          {/if}
          <span class="min-w-0 flex-1 truncate">{option.label}</span>
          {#if ui.display === 'list' && isChecked}
            <Check class="size-4 shrink-0" aria-hidden="true" />
          {/if}
        </button>
      {/if}
    {/each}
  </div>
</AzuosFilterField>
