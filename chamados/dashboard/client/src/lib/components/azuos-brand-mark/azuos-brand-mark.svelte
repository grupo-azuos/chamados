<script lang="ts" module>
  /**
   * A marca, a partir dos ARQUIVOS OFICIAIS do Grupo Azuos — o mesmo formato do paralegal.
   *
   * - `full`: a logo branca inteira. Feita para fundo escuro, por isso só existe sobre a barra
   *   azul (ou outro fundo da marca), nunca sobre o branco do conteúdo.
   * - `icon`: o símbolo oficial em SVG, também branco. É o que identifica a marca com a barra
   *   recolhida, sem espremer o nome inteiro em poucos pixels.
   * - `tile`: o ícone de app oficial (símbolo sobre o quadrado azul). É o que vai nas telas de
   *   fundo claro — entrar, recuperar senha —, onde as duas versões brancas sumiriam.
   *
   * Os arquivos vêm do pacote de marca (`brand/logo`); nenhum é redesenhado à mão.
   */
  export type AzuosBrandMarkProps = {
    ui?: {
      size?: 'sm' | 'md' | 'lg';
      variant?: 'full' | 'icon' | 'tile';
      className?: string;
    };
  };

  /** Larguras em px. A altura é proporcional: a logo é uma imagem, não um ícone quadrado. */
  export const BRAND_WIDTHS = {
    full: { sm: 84, md: 110, lg: 180 },
    icon: { sm: 28, md: 36, lg: 48 },
    tile: { sm: 40, md: 48, lg: 80 },
  } as const;
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import appIcon from './assets/azuos-app-icon.png';
  import icon from './assets/azuos-icon.svg';
  import logoWhite from './assets/azuos-logo-oficial-white.png';

  let { ui }: AzuosBrandMarkProps = $props();

  const SOURCES = { full: logoWhite, icon, tile: appIcon } as const;

  const variant = $derived(ui?.variant ?? 'full');
  const width = $derived(BRAND_WIDTHS[variant][ui?.size ?? 'md']);
</script>

<!-- `width` fixo desde o primeiro quadro: uma imagem sem largura salta de tamanho quando o
     arquivo termina de carregar, e o cabeçalho da barra pula junto. O nome vai no texto
     alternativo: quem usa leitor de tela continua ouvindo de quem é a marca. -->
<img
  src={SOURCES[variant]}
  {width}
  alt="Grupo Azuos"
  class={cn('h-auto shrink-0', ui?.className)}
  style:width="{width}px"
/>
