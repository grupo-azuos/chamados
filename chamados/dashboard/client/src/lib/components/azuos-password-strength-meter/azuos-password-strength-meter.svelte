<script lang="ts" module>
  import type { PasswordStrength } from '$lib/utils/password-strength.util';

  /**
   * A BARRA DE FORÇA — quatro blocos e uma lista do que falta.
   *
   * Ela informa, e não tranca: o botão de enviar obedece ao schema, que é o mesmo que o servidor
   * confere. Travar o envio aqui criaria uma regra que só existe na tela.
   *
   * A lista embaixo existe porque a barra sozinha não ensina: com os quatro itens à vista a pessoa
   * vê qual deles falta.
   *
   * A cor NUNCA é o único sinal: cada item tem ícone e o rótulo diz o nível por extenso.
   */
  export type AzuosPasswordStrengthMeterProps = {
    data: { strength: PasswordStrength };
    ui?: { className?: string };
  };

  /* Um bloco por critério cumprido. A cor sobe junto: um critério é vermelho, dois e três
     amarelo, os quatro verde. */
  const FILL: Record<number, string> = {
    1: 'bg-destructive',
    2: 'bg-brand-yellow-500',
    3: 'bg-brand-yellow-500',
    4: 'bg-success',
  };
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Dot from '@lucide/svelte/icons/dot';

  import { STRENGTH_HINTS, STRENGTH_LABELS, STRENGTH_RULES } from '$lib/utils/password-strength.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosPasswordStrengthMeterProps = $props();

  const score = $derived(data.strength.score);
</script>

<div class={cn('flex flex-col gap-2.5', ui?.className)}>
  <div class="flex items-center gap-3">
    <!-- Decoração do que o texto ao lado já diz — por isso `aria-hidden`. -->
    <div aria-hidden="true" class="flex flex-1 gap-1.5">
      {#each [1, 2, 3, 4] as block (block)}
        <div
          data-block
          class={cn('h-1.5 flex-1 rounded-full transition-colors', block <= score ? FILL[score] : 'bg-ink-300')}
        ></div>
      {/each}
    </div>
    <p class="text-ink-500 w-20 text-right text-xs font-medium">
      <span class="sr-only">Força da senha: </span>
      {STRENGTH_LABELS[data.strength.level]}
    </p>
  </div>
  <ul class="grid gap-1 sm:grid-cols-2">
    {#each STRENGTH_RULES as rule (rule)}
      {@const isMet = data.strength.met[rule]}
      <li class={cn('flex items-center gap-1 text-xs', isMet ? 'text-success' : 'text-ink-500')}>
        {#if isMet}
          <Check class="size-3.5 shrink-0" aria-hidden="true" />
        {:else}
          <Dot class="size-3.5 shrink-0" aria-hidden="true" />
        {/if}
        <!-- O estado vai no TEXTO, e não só no ícone e na cor. -->
        <span class="sr-only">{isMet ? 'Cumprido: ' : 'Falta: '}</span>
        {STRENGTH_HINTS[rule]}
      </li>
    {/each}
  </ul>
</div>
