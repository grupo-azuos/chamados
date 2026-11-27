<!--
  @component
  OS MÓDULOS DA PESSOA no Chamados — uma seção a mais da ficha padrão do perfil, só deste sistema.

  Mostra um bloco por módulo (`ROLE_CONTEXTS`), com o nome, a descrição e o selo do nível de
  acesso. O nível é o do papel no admin-console; módulo ausente é "sem acesso", e o super admin
  aparece com o mesmo nível em todos. Só leitura: não tem estado nem ação.

  - `data.role`: o papel geral da pessoa (`superadmin` vale para todos os módulos).
  - `data.roles`: o papel em cada módulo.
-->
<script lang="ts" module>
  import { type ContextRoles, type UserRole } from '@template/shared/schemas/user.schema';

  export type AzuosModuleAccessCardProps = {
    data: { role: string; roles?: Partial<ContextRoles> };
  };
</script>

<script lang="ts">
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import { ROLE_CONTEXT_LABELS, ROLE_CONTEXTS } from '@template/shared/schemas/user.schema';

  import {
    contextDescription,
    moduleAccessLabel,
    moduleAccessTone,
  } from '$lib/components/azuos-role-list-view/azuos-role-list-view.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  /**
   * OS MÓDULOS DA PESSOA no Chamados — uma seção a mais da ficha padrão, só deste sistema.
   * O nível é o do papel no admin-console; módulo ausente é sem acesso.
   */
  let { data }: AzuosModuleAccessCardProps = $props();
</script>

<section
  aria-label="Seus módulos"
  class="bg-card rounded-surface flex flex-col gap-4 p-4 sm:p-6 shadow-card"
>
  <h2 class="text-foreground flex items-center gap-2 text-base font-semibold">
    <span class="bg-muted text-primary rounded-chip flex size-8 items-center justify-center">
      <LayoutGrid class="size-4" aria-hidden="true" />
    </span>
    Seus módulos
  </h2>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {#each ROLE_CONTEXTS as ctx (ctx)}
      {@const role = (data.role === 'superadmin' ? 'superadmin' : data.roles?.[ctx]) as UserRole | undefined}
      <div class="rounded-box bg-muted flex flex-col justify-between p-3.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-foreground text-xs font-semibold">{ROLE_CONTEXT_LABELS[ctx]}</span>
          <StatusBadge data={{ label: moduleAccessLabel(role) }} ui={{ tone: moduleAccessTone(role), size: 'sm' }} />
        </div>
        <p class="text-muted-foreground mt-2 text-xs leading-snug">{contextDescription(ctx)}</p>
      </div>
    {/each}
  </div>
</section>
