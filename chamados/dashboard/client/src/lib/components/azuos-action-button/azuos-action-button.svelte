<!--
  @component
  O botão do sistema. Toda ação que não é "enviar formulário" passa por aqui.

  O `Button` baixado do shadcn-svelte NÃO é editado nem importado pelas telas. Este componente o
  envolve e aplica as NOSSAS variantes com `tv()` (`primary`, `secondary`, `ghost`, `danger`,
  `danger-soft`) — o dia em que o CLI sobrescrever o vendor, nenhuma tela muda. A altura e o raio
  vêm da RÉGUA DE MEDIDAS (`lib/theme/tokens.css`): `sm`, `md` (o padrão) e `lg`.

  Carregando (`state.isLoading`), ele trava e troca o ícone pelo giro, com `data.loadingLabel` no
  lugar do rótulo: dois cliques em "Excluir" seriam duas requisições, e a segunda voltaria como
  "não encontrado" de algo que acabou de dar certo.

  - `data`: o rótulo e o rótulo de carregando.
  - `ui`: variante, tamanho, ícone e `isIconOnly` (o rótulo vira `aria-label` e dica).
  - `state`: carregando, desligado e `isPressed` (anuncia o botão que liga/desliga).
  - `actions`: `onClick`.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import { tv } from 'tailwind-variants';

  // Permite compor gatilhos nas features sem acessar os arquivos gerados pelo CLI.
  import { Button as ButtonPrimitive } from '$lib/components/ui/button';
  export const AzuosButtonPrimitive = ButtonPrimitive;
  export * as AzuosDropdownMenuPrimitive from '$lib/components/ui/dropdown-menu';

  /**
   * A altura e o raio vêm da RÉGUA DE MEDIDAS (`lib/theme/tokens.css`), e não do componente
   * baixado: ele tem a escala dele (32, 28, 24px), que não é a do projeto. Era esse
   * desencontro que deixava o "Cancelar" mais baixo que o "Salvar" no rodapé do diálogo.
   *
   * O `size` do `Button`, mais abaixo, continua entrando — mas só pelo tamanho do ícone e
   * pelo espaço entre ícone e texto. A altura é nossa.
   */
  export const actionButton = tv({
    base: 'rounded-button max-w-full min-w-0 align-middle font-semibold shadow-xs transition-all',
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-muted text-foreground hover:bg-accent',
        ghost:
          'text-foreground/80 hover:bg-accent hover:text-foreground border border-transparent bg-transparent shadow-none',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        /* O perigo discreto, para a lixeira de uma linha: vermelho claro parado, cheio no hover. */
        'danger-soft':
          'bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-none',
      },
      size: {
        sm: 'control-sm',
        md: 'control-md',
        lg: 'control-lg',
      },
      /* Botão só de ícone é quadrado: a largura acompanha a altura, e não o ícone dentro. */
      isIconOnly: { true: '', false: '' },
    },
    compoundVariants: [
      { size: 'sm', isIconOnly: true, class: 'control-icon-sm' },
      { size: 'md', isIconOnly: true, class: 'control-icon-md' },
      { size: 'lg', isIconOnly: true, class: 'control-icon-lg' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', isIconOnly: false },
  });

  export type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft';

  export type ActionButtonSize = 'sm' | 'md' | 'lg';

  export type AzuosActionButtonProps = {
    data: { label: string; loadingLabel?: string };
    ui?: {
      variant?: ActionButtonVariant;
      /**
       * O degrau da régua de medidas (`lib/theme/tokens.css`).
       *
       * `sm` dentro de uma linha de tabela, `md` (o padrão) para a ação da tela e o rodapé
       * do diálogo, `lg` quando o botão divide fileira com um campo de formulário — ali ele
       * tem que ter a altura do campo, não a dele.
       */
      size?: ActionButtonSize;
      icon?: LucideIcon;
      /** Só o ícone aparece; o rótulo vira `aria-label` e dica. Use com parcimônia. */
      isIconOnly?: boolean;
      className?: string;
    };
    state?: {
      isLoading?: boolean;
      isDisabled?: boolean;
      /** Para botão que liga/desliga ou faz parte de uma escolha: anuncia qual está valendo. */
      isPressed?: boolean;
    };
    actions?: { onClick?: () => void };
  };

  function resolveState(state: AzuosActionButtonProps['state']) {
    return { isBusy: Boolean(state?.isLoading), isDisabled: Boolean(state?.isDisabled) };
  }

  function resolveContent(
    data: AzuosActionButtonProps['data'],
    ui: AzuosActionButtonProps['ui'],
    isBusy: boolean,
  ): { Icon: LucideIcon | undefined; label: string | null; accessibleName: string | undefined } {
    const text = isBusy ? (data.loadingLabel ?? data.label) : data.label;
    const Icon = isBusy ? Loader2 : ui?.icon;
    if (ui?.isIconOnly) return { Icon, label: null, accessibleName: data.label };

    return { Icon, label: text, accessibleName: undefined };
  }

  /** Do componente baixado sobram o tamanho do ícone e o espaço até o texto. */
  const BUTTON_SIZES: Record<ActionButtonSize, 'sm' | 'default' | 'lg'> = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  };

  const BUTTON_ICON_SIZES: Record<ActionButtonSize, 'icon-sm' | 'icon' | 'icon-lg'> = {
    sm: 'icon-sm',
    md: 'icon',
    lg: 'icon-lg',
  };

  function buttonSize(
    ui: AzuosActionButtonProps['ui'],
  ): 'sm' | 'default' | 'lg' | 'icon-sm' | 'icon' | 'icon-lg' {
    const size = ui?.size ?? 'md';
    if (ui?.isIconOnly) return BUTTON_ICON_SIZES[size];

    return BUTTON_SIZES[size];
  }
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { cn } from '$lib/utils/cn';
  import { Button } from '$lib/components/ui/button';

  let { data, ui, state, actions }: AzuosActionButtonProps = $props();

  const { isBusy, isDisabled } = $derived(resolveState(state));
  const { Icon, label, accessibleName } = $derived(resolveContent(data, ui, isBusy));
</script>

<Button
  type="button"
  size={buttonSize(ui)}
  disabled={isBusy || isDisabled}
  aria-busy={isBusy}
  aria-pressed={state?.isPressed}
  aria-label={accessibleName}
  title={accessibleName}
  onclick={actions?.onClick}
  class={cn(
    actionButton({ variant: ui?.variant, size: ui?.size, isIconOnly: ui?.isIconOnly }),
    ui?.className,
  )}
>
  {#if Icon}
    <Icon class={cn(isBusy && 'animate-spin')} aria-hidden="true" />
  {/if}
  <!-- Rótulo longo numa coluna estreita: corta com "…" em vez de estourar a coluna. -->
  {#if label}
    <span class="min-w-0 truncate">{label}</span>
  {/if}
</Button>
