<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * Escolher um ícone numa grade de prontos. Botões que ligam e desligam (`aria-pressed`), e não
   * um `<select>`: ícone se escolhe vendo, e uma lista de nomes ("shield-check") não diz nada a
   * ninguém.
   *
   * Cada ícone tem um nome em português no `aria-label` e no `title` — é ele que o leitor de tela
   * anuncia e que aparece ao passar o mouse.
   */
  export type AzuosIconPickerOption = { value: string; label: string; icon: LucideIcon };

  export type AzuosIconPickerProps = {
    data: { value: string | null; options: AzuosIconPickerOption[] };
    ui: { label: string; className?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (value: string) => void };
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosIconPickerProps = $props();

  const labelId = `icon-picker-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class={cn('flex flex-col gap-1.5', ui.className)}>
  <span id={labelId} class="text-ink-700 text-sm font-medium">{ui.label}</span>
  <div role="group" aria-labelledby={labelId} class="flex flex-wrap gap-2">
    {#each data.options as option (option.value)}
      {@const isSelected = option.value === data.value}
      {@const Icon = option.icon}
      <button
        type="button"
        aria-label={option.label}
        aria-pressed={isSelected}
        title={option.label}
        disabled={state?.isDisabled}
        onclick={() => actions.onChange(option.value)}
        class={cn(
          'rounded-control focus-visible:ring-ring flex size-(--control-lg) cursor-pointer items-center justify-center border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-card text-ink-700 hover:bg-muted',
        )}
      >
        <Icon class="size-4" aria-hidden="true" />
      </button>
    {/each}
  </div>
</div>
