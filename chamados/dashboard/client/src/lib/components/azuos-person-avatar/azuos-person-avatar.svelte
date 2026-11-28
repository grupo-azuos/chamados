<!--
  @component
  A pessoa, em duas letras — ou na foto, quando houver.

  As iniciais não são enfeite: numa lista de trinta linhas, o olho acha "MR" antes de ler "Mariana
  Ribeiro". Duas letras bastam — nome comprido no avatar vira borrão ilegível.

  - `name`: o nome de onde saem as iniciais.
  - `avatarUrl`: a foto, quando a tela já a tem.
  - `personId`: o id da pessoa no diretório.
  - `email`: o e-mail, para o registro que guardou o login e não o id. Um `name` que é e-mail
    também é procurado assim.

  REGRA DO GRUPO: onde aparece uma pessoa, aparece a FOTO dela. Sem `avatarUrl`, o rosto procura
  a foto no diretório de pessoas (`people-directory`) pelo `personId`, pelo `email` — ou pelo
  `name`, quando o registro só guardou o nome. As iniciais só aparecem quando a pessoa não tem foto mesmo.
  - `ui`: o tamanho (`sm`, `md`, `lg`, `xl`) e classes extras.
-->
<script lang="ts" module>
  export type AzuosPersonAvatarProps = {
    name: string;
    /**
     * Hoje ninguém tem foto — não existe tabela de usuário, então não há de onde vir uma. O
     * campo já existe para o dia em que o provedor de auth-forward resolver o nome para uma
     * pessoa de verdade: quem usa `PersonAvatar` não muda, só passa a receber `avatarUrl`.
     */
    avatarUrl?: string | null;
    personId?: string | null;
    /** O e-mail da pessoa, para o registro que guardou o login e não o id. */
    email?: string | null;
    ui?: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string };
  };

  const SIZE_CLASS = {
    sm: 'size-6 text-xs',
    md: 'size-8 text-xs',
    lg: 'size-12 text-sm',
    xl: 'size-16 text-lg',
  } as const;

  /** Duas iniciais bastam; nome comprido no avatar vira borrão ilegível. */
  function initialsOf(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
</script>

<script lang="ts">
  import { personPhotoOf } from '$lib/hooks/use-people-directory/people-directory.svelte';
  import { cn } from '$lib/utils/cn';

  let { name, avatarUrl, personId, email, ui }: AzuosPersonAvatarProps = $props();

  const photo = $derived(avatarUrl || personPhotoOf({ id: personId, name, email }));
  const size = $derived(ui?.size ?? 'sm');
  /* A foto que falhou ao carregar. Guardada pelo endereço: trocou de pessoa, tenta a foto nova. */
  let failedPhoto = $state<string | null>(null);
  const isPhotoShown = $derived(Boolean(photo) && photo !== failedPhoto);
</script>

<!-- As iniciais ficam SEMPRE embaixo, e a foto por cima. Com o avatar do bits-ui, as iniciais
     sumiam assim que ele dava a foto por carregada — e a foto que vinha vazia, ou que trocava no
     meio do carregamento, deixava o rosto em branco no seletor. Aqui, foto que falha sai e as
     iniciais aparecem; foto que demora deixa as iniciais à vista até chegar. -->
<span
  data-slot="avatar"
  class={cn(
    'bg-primary text-primary-foreground relative inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full font-bold select-none',
    SIZE_CLASS[size],
    ui?.className,
  )}
>
  <span data-slot="avatar-fallback" aria-hidden={isPhotoShown || undefined}>{initialsOf(name)}</span>
  {#if isPhotoShown}
    <img
      data-slot="avatar-image"
      src={photo}
      alt={name}
      class="absolute inset-0 size-full rounded-full object-cover"
      onerror={() => (failedPhoto = photo)}
    />
  {/if}
</span>
