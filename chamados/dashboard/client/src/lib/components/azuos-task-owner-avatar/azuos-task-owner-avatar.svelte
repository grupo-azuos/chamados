<!--
  @component
  O ROSTO DO RESPONSÁVEL da tarefa: a foto (ou as iniciais) de quem é; sem responsável, um
  ícone neutro — "Sem responsável" não é uma pessoa, e as iniciais "SR" fariam parecer que é.

  - `owner`: a pessoa da tarefa, ou `null`.
-->
<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  export type AzuosTaskOwnerAvatarProps = { owner: Task['owner'] };
</script>

<script lang="ts">
  import UserRound from '@lucide/svelte/icons/user-round';

  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';

  let { owner }: AzuosTaskOwnerAvatarProps = $props();
</script>

{#if owner}
  <PersonAvatar name={owner.name ?? 'Fora do diretório'} avatarUrl={owner.avatarUrl} personId={owner.id} ui={{ size: 'sm' }} />
{:else}
  <span class="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
    <UserRound class="size-3.5" />
  </span>
{/if}
