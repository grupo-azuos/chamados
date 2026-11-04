<script lang="ts" module>
  /**
   * OS AVISOS DE RODAPÉ — "Chamado aberto.", "Manutenção registrada.". Uma frase curta sobre o
   * que acabou de acontecer, no canto de baixo, sobre a tela.
   *
   * É o Sonner (o toast do shadcn, `ui/sonner`), montado UMA vez na casca: quem avisa só chama
   * `useNotice().show(...)`, de qualquer tela. Ele empilha dois avisos seguidos em vez de um
   * apagar o outro, PAUSA o tempo enquanto o mouse está em cima, fecha no X e anuncia ao leitor
   * de tela.
   *
   * Todo aviso fica 5 segundos na tela e some sozinho. Um tempo só, para a pessoa aprender o
   * ritmo.
   *
   * As cores são os tokens do tema (claro e escuro, pelo mesmo tema do botão de tema): o aviso
   * comum no fundo de popover; o de falha no fundo vermelho-claro, com a borda neutra — borda
   * colorida é proibida no grupo.
   */
  export const TOAST_DURATION_MS = 5000;

  export type AzuosToasterProps = {
    ui?: { position?: 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center' };
  };

  export const TOASTER_TOKENS = [
    '--normal-bg: var(--popover)',
    '--normal-text: var(--popover-foreground)',
    '--normal-border: var(--border)',
    '--error-bg: var(--destructive-soft)',
    '--error-text: var(--destructive)',
    '--error-border: var(--border)',
    '--border-radius: var(--radius-box)',
  ].join('; ');
</script>

<script lang="ts">
  import { Toaster } from '$lib/components/ui/sonner';
  import { useThemeModel } from '$lib/theme/theme.svelte';

  let { ui }: AzuosToasterProps = $props();

  const theme = useThemeModel();
</script>

<Toaster
  theme={theme.theme}
  position={ui?.position ?? 'bottom-right'}
  duration={TOAST_DURATION_MS}
  richColors
  closeButton
  containerAriaLabel="Avisos"
  toastOptions={{ closeButtonAriaLabel: 'Fechar aviso' }}
  style={TOASTER_TOKENS}
/>
