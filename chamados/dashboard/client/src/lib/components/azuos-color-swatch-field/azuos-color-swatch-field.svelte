<script lang="ts" module>
  /**
   * Escolha de cor: "aleatória", as cinco da paleta, e qualquer outra pelo seletor do navegador.
   *
   * A paleta vem primeiro porque é o caminho curto e o seguro — as cinco aguentam texto branco
   * por cima. O seletor livre existe para quem quer outra cor; se ela for clara, quem pinta o
   * cartão troca o texto para escuro sozinho (`isLightColor`).
   *
   * `value` vazio é "aleatória", e o botão diz isso por escrito: um quadrado sem cor nenhuma
   * marcado não comunica "o sistema escolhe para você". Onde a cor é obrigatória,
   * `ui.allowRandom: false` tira o botão.
   *
   * A cor vai por `style`: é uma cor que a PESSOA escolhe, e não há token para ela.
   */
  export type AzuosColorSwatchFieldProps = {
    data: { value: string };
    ui?: { allowRandom?: boolean; ariaLabel?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Palette from '@lucide/svelte/icons/palette';
  import Shuffle from '@lucide/svelte/icons/shuffle';

  import { COMPANY_COLOR_PALETTE, isHexColor } from '$lib/utils/company-color.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosColorSwatchFieldProps = $props();

  const value = $derived(data.value.toLowerCase());
  const isCustom = $derived(
    isHexColor(value) && !COMPANY_COLOR_PALETTE.some((color) => color === value),
  );
</script>

<div role="radiogroup" aria-label={ui?.ariaLabel ?? 'Cor do cartão'} class="flex flex-wrap items-center gap-2">
  {#if ui?.allowRandom !== false}
    <button
      type="button"
      role="radio"
      aria-checked={!value}
      disabled={state?.isDisabled}
      onclick={() => actions.onChange('')}
      class={cn(
        'control-lg rounded-control flex items-center gap-1.5 border px-3 text-sm font-medium transition',
        !value ? 'bg-primary text-primary-foreground' : 'border-input text-foreground hover:bg-muted',
      )}
    >
      <Shuffle class="size-3.5" aria-hidden="true" />
      Aleatória
    </button>
  {/if}
  {#each COMPANY_COLOR_PALETTE as color (color)}
    <button
      type="button"
      role="radio"
      aria-checked={value === color}
      aria-label={`Cor ${color}`}
      title={color}
      disabled={state?.isDisabled}
      onclick={() => actions.onChange(color)}
      style:background-color={color}
      class={cn(
        'control-lg rounded-control text-primary-foreground focus-visible:ring-ring flex size-10 items-center justify-center transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2',
        value === color && 'scale-105 shadow-xs',
      )}
    >
      {#if value === color}
        <Check class="size-4" aria-hidden="true" />
      {/if}
    </button>
  {/each}
  <!-- O `<input type="color">` é o próprio quadrado: clicar abre o seletor do sistema. -->
  <label
    title="Outra cor"
    class={cn(
      'control-lg rounded-control border-input focus-within:ring-ring relative flex size-10 cursor-pointer items-center justify-center overflow-hidden border border-dashed transition focus-within:ring-2 focus-within:ring-offset-2 hover:scale-105',
      isCustom && 'border-solid shadow-xs',
    )}
    style:background-color={isCustom ? value : undefined}
  >
    <span class="sr-only">Outra cor</span>
    {#if isCustom}
      <Check class="text-primary-foreground size-4" aria-hidden="true" />
    {:else}
      <Palette class="text-muted-foreground size-4" aria-hidden="true" />
    {/if}
    <input
      type="color"
      value={isHexColor(value) ? value : COMPANY_COLOR_PALETTE[0]}
      disabled={state?.isDisabled}
      onchange={(event) => actions.onChange(event.currentTarget.value.toLowerCase())}
      class="absolute inset-0 cursor-pointer opacity-0"
    />
  </label>
</div>
