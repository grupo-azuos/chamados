<script lang="ts">
  import Palette from '@lucide/svelte/icons/palette';

  import EffectsToggle from '$lib/components/azuos-effects-toggle/azuos-effects-toggle.svelte';
  import ThemeToggle from '$lib/components/azuos-theme-toggle/azuos-theme-toggle.svelte';

  // Reutiliza os controles e o armazenamento existentes; o perfil só reúne as preferências.
</script>

<section aria-labelledby="profile-preferences-title" class="bg-card rounded-surface border p-4 shadow-xs sm:p-5">
  <div class="mb-4 flex items-start gap-3">
    <Palette class="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <div>
      <h2 id="profile-preferences-title" class="text-ink-900 text-sm font-semibold">Aparência</h2>
      <p class="text-ink-500 mt-1 text-xs">Suas preferências ficam salvas neste navegador.</p>
    </div>
  </div>
  <div class="divide-border/60 divide-y">
    <div class="flex items-center justify-between gap-4 pb-3">
      <div class="min-w-0">
        <h3 class="text-ink-900 text-sm font-medium">Tema</h3>
        <p class="text-ink-500 mt-0.5 text-xs">Alterne entre claro e escuro.</p>
      </div>
      <ThemeToggle ui={{ variant: 'surface' }} />
    </div>
    <div class="flex items-center justify-between gap-4 pt-3">
      <div class="min-w-0">
        <h3 class="text-ink-900 text-sm font-medium">Efeitos</h3>
        <p class="text-ink-500 mt-0.5 text-xs">Use animações completas ou o modo leve.</p>
      </div>
      <EffectsToggle ui={{ variant: 'surface' }} />
    </div>
  </div>
</section>
