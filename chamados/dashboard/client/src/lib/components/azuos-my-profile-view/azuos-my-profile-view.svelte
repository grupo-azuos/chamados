<script lang="ts" module>
  import type { Component, Snippet } from 'svelte';

  /**
   * MEU PERFIL — a mesma ficha dos 13 sistemas, no par Svelte da casca padrão.
   *
   * Igual ao `AzuosMyProfileView` dos sistemas em React: cartão com a faixa da marca, a foto,
   * os fatos de relance, as seções com índice ao lado e nenhum campo de texto — quem edita a
   * conta é o admin-console. O que é só do Chamados (módulos, WhatsApp, equipe, efeitos) entra
   * pelos encaixes, sempre DEPOIS das seções padrão.
   *
   * Travada pelo hook `protect-app-shell.mjs`. Pedido de mudança vai para o suporte.
   */
  export type MyProfileSystem = { name: string; url: string; roleLabel: string };

  export type MyProfilePerson = {
    name: string;
    email: string | null;
    roleLabel: string;
    avatarUrl: string | null;
    jobTitle: string | null;
    department: string | null;
    phone?: string | null;
    birthDateLabel?: string | null;
    bio?: string | null;
    systems?: MyProfileSystem[];
  };

  export type MyProfileExtraSection = {
    id: string;
    label: string;
    icon: Component;
    content: Snippet;
  };

  export type AzuosMyProfileViewProps = {
    data: { person: MyProfilePerson | null; accountUrl: string | null; theme: 'light' | 'dark' };
    state?: { isLoading?: boolean; error?: string | null };
    actions: { onToggleTheme: () => void; onRetry?: () => void };
    slots?: { extraSections?: MyProfileExtraSection[]; preferencesExtra?: Snippet };
  };

  const EMPTY = 'Não informado';

  /** Duas iniciais bastam; nome comprido no avatar vira borrão ilegível. */
  export function initialsOf(name: string): string {
    const initials = name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return initials || '?';
  }
</script>

<script lang="ts">
  import AppWindow from '@lucide/svelte/icons/app-window';
  import Briefcase from '@lucide/svelte/icons/briefcase';
  import Building2 from '@lucide/svelte/icons/building-2';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Mail from '@lucide/svelte/icons/mail';
  import Moon from '@lucide/svelte/icons/moon';
  import Palette from '@lucide/svelte/icons/palette';
  import Phone from '@lucide/svelte/icons/phone';
  import Sun from '@lucide/svelte/icons/sun';
  import UserRound from '@lucide/svelte/icons/user-round';

  import { cn } from '$lib/utils/cn';

  let { data, state, actions, slots }: AzuosMyProfileViewProps = $props();

  const extras = $derived(slots?.extraSections ?? []);
  const sections = $derived([
    { id: 'profile-personal', label: 'Dados pessoais', icon: UserRound as Component },
    { id: 'profile-organization', label: 'Organização', icon: Building2 as Component },
    { id: 'profile-systems', label: 'Sistemas', icon: AppWindow as Component },
    ...extras.map(({ id, label, icon }) => ({ id, label, icon })),
    { id: 'profile-preferences', label: 'Preferências', icon: Palette as Component },
  ]);
  const isDark = $derived(data.theme === 'dark');
</script>

{#snippet field(label: string, value: string | null | undefined, isWide = false)}
  <div class={cn('flex min-w-0 flex-col gap-1', isWide && 'sm:col-span-2')}>
    <dt class="text-ink-500 text-xs font-medium">{label}</dt>
    <dd class={cn('text-sm break-words whitespace-pre-line', value ? 'text-foreground' : 'text-ink-500')}>
      {value ?? EMPTY}
    </dd>
  </div>
{/snippet}

{#snippet fact(label: string, value: string | null | undefined, Icon: Component)}
  <div class="bg-muted rounded-box flex min-w-0 items-center gap-3 p-3">
    <span class="bg-primary/10 text-primary rounded-chip flex size-9 shrink-0 items-center justify-center">
      <Icon class="size-4" aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <dt class="text-ink-500 text-xs">{label}</dt>
      <dd class={cn('truncate text-sm font-medium', value ? 'text-foreground' : 'text-ink-500')}>
        {value ?? EMPTY}
      </dd>
    </div>
  </div>
{/snippet}

{#snippet card(title: string, Icon: Component, body: Snippet)}
  <section
    aria-label={title}
    class="bg-card border-border rounded-surface flex flex-col gap-4 border p-4 shadow-xs sm:p-6"
  >
    <h2 class="text-foreground flex items-center gap-2 text-base font-semibold">
      <span class="bg-primary/10 text-primary rounded-chip flex size-8 items-center justify-center">
        <Icon class="size-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
    {@render body()}
  </section>
{/snippet}

{#snippet roleBadge(label: string)}
  <span class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold">
    {label}
  </span>
{/snippet}

{#snippet errorNotice(message: string)}
  <div
    role="alert"
    class="border-border text-destructive rounded-box flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm"
  >
    <span>{message}</span>
    {#if actions.onRetry}
      <button type="button" onclick={actions.onRetry} class="rounded-control hover:bg-muted px-3 py-1.5 text-sm font-medium">
        Tentar de novo
      </button>
    {/if}
  </div>
{/snippet}

{#if state?.isLoading}
  <div role="status" aria-busy="true" class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
    <span class="sr-only">Carregando seu perfil…</span>
    <div class="bg-card border-border rounded-surface overflow-hidden border shadow-xs">
      <div class="bg-muted h-20 animate-pulse"></div>
      <div class="flex flex-col gap-4 p-4 sm:p-6">
        <div class="bg-muted -mt-16 size-24 animate-pulse rounded-full"></div>
        <div class="bg-muted rounded-box h-6 w-56 animate-pulse"></div>
      </div>
    </div>
    <div class="bg-muted rounded-surface h-40 animate-pulse"></div>
  </div>
{:else if !data.person}
  {@render errorNotice(state?.error ?? 'Não consegui carregar seu perfil.')}
{:else}
  {@const person = data.person}
  <section aria-label="Meu perfil" class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
    <section aria-label="Identidade" class="bg-card border-border rounded-surface overflow-hidden border shadow-xs">
      <div aria-hidden="true" class="from-primary to-primary/70 h-20 bg-gradient-to-r sm:h-24"></div>
      <div class="flex flex-col gap-5 px-4 pb-4 sm:px-6 sm:pb-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            role={person.avatarUrl ? undefined : 'img'}
            aria-label={person.avatarUrl ? undefined : person.name}
            class="bg-brand-yellow-400 text-brand-blue-900 ring-card relative -mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold ring-4"
          >
            <span aria-hidden={person.avatarUrl ? 'true' : undefined}>{initialsOf(person.name)}</span>
            {#if person.avatarUrl}
              <img src={person.avatarUrl} alt={`Foto de ${person.name}`} class="absolute inset-0 size-full object-cover" />
            {/if}
          </span>
          <div class="flex min-w-0 flex-1 flex-col gap-1 sm:pt-3">
            <h1 class="text-primary text-2xl font-bold break-words">{person.name}</h1>
            <p class="text-ink-500 flex min-w-0 items-center gap-1.5 text-sm">
              <Mail class="size-4 shrink-0" aria-hidden="true" />
              <span class="break-all">{person.email ?? 'Sem e-mail'}</span>
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-2">{@render roleBadge(person.roleLabel)}</div>
          </div>
          {#if data.accountUrl}
            <a
              href={data.accountUrl}
              class="border-border text-foreground hover:bg-muted rounded-control inline-flex shrink-0 items-center gap-2 self-start border px-3 py-2 text-sm font-medium transition-colors sm:mt-3"
            >
              <ExternalLink class="size-4" aria-hidden="true" />
              Editar no Admin Console
            </a>
          {/if}
        </div>
        <dl class="grid gap-3 sm:grid-cols-3">
          {@render fact('Telefone', person.phone, Phone as Component)}
          {@render fact('Cargo', person.jobTitle, Briefcase as Component)}
          {@render fact('Departamento', person.department, Building2 as Component)}
        </dl>
      </div>
    </section>

    {#if state?.error}
      {@render errorNotice(state.error)}
    {/if}

    <div class="grid gap-6 lg:grid-cols-12 lg:items-start">
      <nav aria-label="Seções da página" class="hidden lg:sticky lg:top-6 lg:col-span-3 lg:block">
        <p class="text-ink-500 mb-2 px-3 text-xs font-semibold tracking-wider uppercase">Nesta página</p>
        <ul class="flex flex-col gap-0.5">
          {#each sections as section (section.id)}
            <li>
              <a
                href={`#${section.id}`}
                class="rounded-control hover:bg-muted hover:text-foreground text-ink-700 flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors"
              >
                <section.icon class="size-4 shrink-0" aria-hidden="true" />
                {section.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <div class="flex min-w-0 flex-col gap-6 lg:col-span-9">
        <div id="profile-personal" class="scroll-mt-6">
          {#snippet personalBody()}
            <dl class="grid gap-4 sm:grid-cols-2">
              {@render field('Nome', person.name)}
              {@render field('E-mail', person.email)}
              {@render field('Telefone', person.phone)}
              {@render field('Data de nascimento', person.birthDateLabel)}
              {@render field('Bio', person.bio, true)}
            </dl>
          {/snippet}
          {@render card('Dados pessoais', UserRound as Component, personalBody)}
        </div>

        <div id="profile-organization" class="scroll-mt-6">
          {#snippet organizationBody()}
            <dl class="grid gap-4 sm:grid-cols-2">
              {@render field('Cargo', person.jobTitle)}
              {@render field('Departamento', person.department)}
            </dl>
          {/snippet}
          {@render card('Organização', Building2 as Component, organizationBody)}
        </div>

        <div id="profile-systems" class="scroll-mt-6">
          {#snippet systemsBody()}
            {#if !person.systems}
              <p class="text-ink-500 text-sm">Não consegui ver seus sistemas agora.</p>
            {:else if person.systems.length === 0}
              <p class="text-ink-500 text-sm">Você ainda não tem acesso a nenhum sistema.</p>
            {:else}
              <ul class="divide-border flex flex-col divide-y">
                {#each person.systems as system (system.url)}
                  <li class="flex items-center justify-between gap-3 py-2.5">
                    <a href={system.url} class="text-foreground hover:text-primary min-w-0 truncate text-sm font-medium transition-colors">
                      {system.name}
                    </a>
                    {@render roleBadge(system.roleLabel)}
                  </li>
                {/each}
              </ul>
            {/if}
          {/snippet}
          {@render card('Sistemas', AppWindow as Component, systemsBody)}
        </div>

        {#each extras as section (section.id)}
          <div id={section.id} class="scroll-mt-6">{@render section.content()}</div>
        {/each}

        <div id="profile-preferences" class="scroll-mt-6">
          {#snippet preferencesBody()}
            <dl class="flex flex-col gap-4">
              <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 flex-col gap-1">
                  <dt class="text-foreground text-sm font-medium">Tema escuro</dt>
                  <dd class="text-ink-500 text-xs">Vale para este navegador.</dd>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label="Tema escuro"
                  onclick={actions.onToggleTheme}
                  class={cn(
                    'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
                    isDark ? 'bg-primary' : 'bg-ink-300',
                  )}
                >
                  <span
                    class={cn(
                      'bg-card text-primary flex size-5 items-center justify-center rounded-full shadow-xs transition-transform',
                      isDark ? 'translate-x-6' : 'translate-x-1',
                    )}
                  >
                    {#if isDark}<Moon class="size-3" aria-hidden="true" />{:else}<Sun class="size-3" aria-hidden="true" />{/if}
                  </span>
                </button>
              </div>
              {@render slots?.preferencesExtra?.()}
            </dl>
          {/snippet}
          {@render card('Preferências', Palette as Component, preferencesBody)}
        </div>
      </div>
    </div>
  </section>
{/if}
