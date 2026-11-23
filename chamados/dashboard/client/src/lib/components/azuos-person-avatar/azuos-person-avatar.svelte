<!--
  @component
  A pessoa, em duas letras — ou na foto, quando houver.

  As iniciais não são enfeite: numa lista de trinta linhas, o olho acha "MR" antes de ler "Mariana
  Ribeiro". Duas letras bastam — nome comprido no avatar vira borrão ilegível.

  - `name`: o nome de onde saem as iniciais.
  - `avatarUrl`: a foto, quando a tela já a tem.
  - `personId`: o id da pessoa no diretório.

  REGRA DO GRUPO: onde aparece uma pessoa, aparece a FOTO dela. Sem `avatarUrl`, o rosto procura
  a foto no diretório de pessoas (`people-directory`) pelo `personId` — ou pelo `name`, quando o
  registro só guardou o nome. As iniciais só aparecem quando a pessoa não tem foto mesmo.
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
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
  import { personPhotoOf } from '$lib/hooks/use-people-directory/people-directory.svelte';
  import { cn } from '$lib/utils/cn';

  let { name, avatarUrl, personId, ui }: AzuosPersonAvatarProps = $props();

  const photo = $derived(avatarUrl || personPhotoOf({ id: personId, name }));

  const size = $derived(ui?.size ?? 'sm');
</script>

<Avatar class={cn('relative flex shrink-0 overflow-hidden rounded-full aspect-square', SIZE_CLASS[size], ui?.className)}>
  {#if photo}
    <AvatarImage src={photo} alt={name} class="aspect-square size-full object-cover rounded-full" />
  {/if}
  <AvatarFallback
    class={cn(
      'flex size-full items-center justify-center rounded-full aspect-square bg-primary font-bold text-primary-foreground select-none',
      SIZE_CLASS[size]
    )}
  >
    {initialsOf(name)}
  </AvatarFallback>
</Avatar>
