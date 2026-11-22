<!--
  @component
  AzuosZuzu, a arara — o mascote do Grupo Azuos, o mesmo do paralegal.

  As poses são os arquivos oficiais da marca, na CDN do app brand (`zuzu/zuzu-{pose}.png`), e os
  movimentos repetem os tempos do paralegal — `sway` em 3,2s, `float` em 3s, `pulse` em 1,6s. Um
  mascote parado num canto da tela o dia inteiro, mexendo rápido demais, vira distração; esses
  valores já passaram por esse teste lá.

  O padrão é parado (`anim: 'none'`), e com movimento reduzido no sistema ele fica sempre parado. A
  imagem é decorativa (`alt` vazio): o texto ao lado já diz o que ele diz.

  `data` leva a `pose` e o `anim`; `ui`, o `size` em pixels (96 por padrão) e `className`.
-->
<script lang="ts" module>
  import gsap from 'gsap';

  import { brandAssetUrl } from '$lib/utils/brand-asset.util';

  export type AzuosZuzuPose =
    | 'alert'
    | 'pointing'
    | 'leaning'
    | 'sleeping'
    | 'celebrating'
    | 'idea'
    | 'thumbsup'
    | 'magnifier'
    | 'clock';

  /** Um movimento por estado de humor. `none` é o padrão: parado. */
  export type AzuosZuzuAnim = 'none' | 'sway' | 'float' | 'pulse' | 'breathe' | 'celebrate';

  export type AzuosZuzuProps = {
    data?: { pose?: AzuosZuzuPose; anim?: AzuosZuzuAnim };
    ui?: { size?: number; className?: string };
  };

  export const ZUZU_POSES: Record<AzuosZuzuPose, string> = {
    alert: brandAssetUrl('zuzu/zuzu-alerta.png'),
    pointing: brandAssetUrl('zuzu/zuzu-apontando.png'),
    leaning: brandAssetUrl('zuzu/zuzu-debrucado.png'),
    sleeping: brandAssetUrl('zuzu/zuzu-dormindo.png'),
    celebrating: brandAssetUrl('zuzu/zuzu-festejando.png'),
    idea: brandAssetUrl('zuzu/zuzu-ideia.png'),
    thumbsup: brandAssetUrl('zuzu/zuzu-joinha.png'),
    magnifier: brandAssetUrl('zuzu/zuzu-lupa.png'),
    clock: brandAssetUrl('zuzu/zuzu-relogio.png'),
  };

  type Tween = (target: HTMLImageElement) => gsap.core.Tween;

  /* Uma tabela, e não um `switch`: cada movimento é uma linha, e o teto de complexidade não
     sobe a cada movimento novo. */
  const ANIMATIONS: Record<Exclude<AzuosZuzuAnim, 'none'>, Tween> = {
    /* Debruçado, ele gira preso pelo alto — girar pelo centro o faria flutuar fora da borda. */
    sway: (target) =>
      gsap.to(target, {
        rotate: 4,
        duration: 1.6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        startAt: { rotate: -4 },
        transformOrigin: 'top center',
      }),
    float: (target) =>
      gsap.to(target, { y: -8, duration: 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true }),
    /* Escala, e não deslocamento: ao lado de um texto, pular de verdade empurraria a linha. */
    pulse: (target) =>
      gsap.to(target, {
        keyframes: [
          { scale: 1.07, duration: 0.64, ease: 'sine.out' },
          { scale: 0.98, duration: 0.48, ease: 'sine.inOut' },
          { scale: 1, duration: 0.48, ease: 'sine.in' },
        ],
        repeat: -1,
      }),
    breathe: (target) =>
      gsap.to(target, { scale: 1.03, duration: 1.8, ease: 'sine.inOut', repeat: -1, yoyo: true }),
    /* Comemoração NÃO se repete: uma vez e para. Festejando em laço vira ruído. */
    celebrate: (target) =>
      gsap.to(target, {
        keyframes: [
          { y: -14, scale: 1.06, duration: 0.33, ease: 'power2.out' },
          { y: 0, scale: 1, duration: 0.33, ease: 'power2.in' },
          { y: -6, scale: 1.02, duration: 0.22, ease: 'power2.out' },
          { y: 0, scale: 1, duration: 0.22, ease: 'power2.in' },
        ],
      }),
  };
</script>

<script lang="ts">
  import { prefersReducedMotion } from '$lib/motion/motion';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosZuzuProps = $props();

  const size = $derived(ui?.size ?? 96);
  const anim = $derived(data?.anim ?? 'none');

  let image: HTMLImageElement | undefined = $state();

  /* Movimento reduzido no sistema operacional costuma ser enjoo, enxaqueca ou vertigem — não
     preferência estética. Um mascote balançando sem parar é exatamente o que essas pessoas
     pediram para não ver, então aqui não vira "mais devagar": vira parado. */
  $effect(() => {
    if (!image || anim === 'none' || prefersReducedMotion()) return;

    const tween = ANIMATIONS[anim](image);

    return () => tween.kill();
  });
</script>

<!-- `alt` vazio e `aria-hidden` de propósito: o Zuzu acompanha um texto (ou um lugar) que já
     diz a mesma coisa. Anunciá-lo faria o leitor de tela ler "imagem" antes do que importa. -->
<img
  bind:this={image}
  src={ZUZU_POSES[data?.pose ?? 'leaning']}
  width={size}
  alt=""
  aria-hidden="true"
  class={cn('h-auto shrink-0 select-none', ui?.className)}
  style:width="{size}px"
/>
