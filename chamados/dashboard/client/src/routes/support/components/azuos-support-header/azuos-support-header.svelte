<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * O CABEÇALHO da Central de Chamados — título, os botões da tela e a pessoa logada.
   *
   * A Central fica fora da casca padrão (não tem menu de módulo), então quem está logado não
   * tinha onde se ver nem onde chegar ao próprio perfil. O cartão da pessoa, à direita, é esse
   * caminho: leva ao perfil da Central (`profileHref`), igual ao rodapé do menu no painel.
   */
  export type AzuosSupportHeaderProps = {
    data: {
      title: string;
      subtitle: string;
      person: { name: string; avatarUrl: string | null } | null;
      /** Para onde o cartão da pessoa leva. Nulo esconde o cartão (já se está no perfil). */
      profileHref: string | null;
    };
    /** Os botões da tela ("Meus chamados", "Voltar"), antes do cartão da pessoa. */
    slots?: { actions?: Snippet };
  };
</script>

<script lang="ts">
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';

  let { data, slots }: AzuosSupportHeaderProps = $props();
</script>

<header class="border-b">
  <div class="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-4 py-6 sm:px-6">
    <div class="min-w-0">
      <h1 class="text-ink-900 text-2xl font-bold">{data.title}</h1>
      <p class="text-ink-500 mt-1 text-sm">{data.subtitle}</p>
    </div>

    <div class="flex shrink-0 items-center gap-3">
      {@render slots?.actions?.()}

      {#if data.person && data.profileHref}
        <a
          href={data.profileHref}
          class="hover:bg-accent focus-visible:ring-ring flex h-10 items-center gap-2 rounded-control px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Meu perfil — ${data.person.name}`}
        >
          <PersonAvatar
            name={data.person.name}
            avatarUrl={data.person.avatarUrl}
            ui={{ size: 'md' }}
          />
          <span class="text-foreground hidden max-w-40 truncate text-sm font-medium sm:inline">
            {data.person.name}
          </span>
        </a>
      {/if}
    </div>
  </div>
</header>
