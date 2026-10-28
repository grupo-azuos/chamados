<script lang="ts" module>
  /**
   * A BARRA DE CIMA da Central de Chamados — marca, as duas telas (abrir e consultar), o tema,
   * a pessoa logada e a saída. Uma linha só, sem título nem descrição.
   *
   * A Central fica fora da casca dos módulos (não tem menu lateral), e antes cada tela trazia
   * um cabeçalho alto com título, subtítulo e botão de "voltar". Com as telas na barra, quem
   * está em qualquer uma chega às outras com um clique, e o conteúdo ganha a altura de volta.
   *
   * A tela atual vem por `activeHref` (quem compõe lê o endereço): a barra não navega sozinha.
   */
  export const SUPPORT_LINKS = [
    { href: '/support', label: 'Abrir chamado', shortLabel: 'Abrir' },
    { href: '/support/tickets', label: 'Consultar chamado', shortLabel: 'Consultar' },
  ] as const;

  export const SUPPORT_PROFILE_HREF = '/support/profile';

  export type AzuosSupportNavbarProps = {
    data: {
      /** O endereço da tela aberta — marca o link dela. */
      activeHref: string;
      person: { name: string; avatarUrl: string | null } | null;
      theme: 'light' | 'dark';
    };
    state?: { isSigningOut?: boolean };
    actions: { onToggleTheme: () => void; onSignOut: () => void };
  };
</script>

<script lang="ts">
  import FilePlus2 from '@lucide/svelte/icons/file-plus-2';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Moon from '@lucide/svelte/icons/moon';
  import Search from '@lucide/svelte/icons/search';
  import Sun from '@lucide/svelte/icons/sun';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BrandMark from '$lib/components/azuos-brand-mark/azuos-brand-mark.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state, actions }: AzuosSupportNavbarProps = $props();

  const ICONS = { '/support': FilePlus2, '/support/tickets': Search } as const;
  const isOnProfile = $derived(data.activeHref === SUPPORT_PROFILE_HREF);
</script>

<header class="bg-card/90 border-border/70 sticky top-0 z-30 border-b backdrop-blur">
  <div class="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
    <a href="/support" class="flex shrink-0 items-center gap-2.5" aria-label="Central de Chamados — início">
      <BrandMark ui={{ variant: 'tile', size: 'sm', className: 'rounded-chip' }} />
      <span class="text-foreground hidden text-sm font-bold md:inline">Central de Chamados</span>
    </a>

    <!-- A tela atual ganha FUNDO, não traço embaixo: barra colorida é proibida no grupo. -->
    <nav class="flex min-w-0 flex-1 items-center gap-1" aria-label="Telas da Central">
      {#each SUPPORT_LINKS as link (link.href)}
        {@const Icon = ICONS[link.href]}
        {@const isActive = data.activeHref === link.href}
        <a
          href={link.href}
          aria-current={isActive ? 'page' : undefined}
          class={cn(
            'control-sm rounded-control focus-visible:ring-ring inline-flex items-center gap-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
            isActive
              ? 'bg-primary-soft text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Icon class="size-4 shrink-0" aria-hidden="true" />
          <span class="sm:hidden">{link.shortLabel}</span>
          <span class="hidden sm:inline">{link.label}</span>
        </a>
      {/each}
    </nav>

    <div class="flex shrink-0 items-center gap-1">
      <ActionButton
        data={{ label: data.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro' }}
        ui={{ variant: 'ghost', size: 'sm', icon: data.theme === 'dark' ? Sun : Moon, isIconOnly: true }}
        actions={{ onClick: actions.onToggleTheme }}
      />

      {#if data.person}
        <a
          href={SUPPORT_PROFILE_HREF}
          aria-current={isOnProfile ? 'page' : undefined}
          aria-label={`Meu perfil — ${data.person.name}`}
          title="Meu perfil"
          class={cn(
            'rounded-control focus-visible:ring-ring flex h-9 items-center gap-2 px-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none',
            isOnProfile ? 'bg-primary-soft' : 'hover:bg-accent',
          )}
        >
          <PersonAvatar name={data.person.name} avatarUrl={data.person.avatarUrl} />
          <span class="text-foreground hidden max-w-32 truncate text-sm font-medium lg:inline">
            {data.person.name}
          </span>
        </a>
      {/if}

      <ActionButton
        data={{ label: 'Sair', loadingLabel: 'Saindo…' }}
        ui={{ variant: 'ghost', size: 'sm', icon: LogOut, isIconOnly: true }}
        state={{ isLoading: state?.isSigningOut }}
        actions={{ onClick: actions.onSignOut }}
      />
    </div>
  </div>
</header>
