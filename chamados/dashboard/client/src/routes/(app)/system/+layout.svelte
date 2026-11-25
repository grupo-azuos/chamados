<script lang="ts">
  import { Portal } from 'bits-ui';
  import { untrack, type Snippet } from 'svelte';
  import { requiresSystemGithub } from '@template/shared/domain/system-access.util';

  import { useGithubConnectionModel } from '$lib/hooks/use-github-connection/use-github-connection.svelte';
  import type { LayoutData } from './$types';
  import GithubLinkGate from './components/azuos-github-link-gate/azuos-github-link-gate.svelte';

  /**
   * A PORTA DO SISTEMA — quem edita o módulo precisa do GitHub vinculado para entrar.
   *
   * A casca (o menu) NÃO mora aqui: ela é uma só, em `(app)/+layout.svelte`, e fica montada ao
   * trocar de módulo. Este layout só decide o que vai na área de conteúdo:
   *
   * - conferindo a vinculação pela primeira vez → nada, com a barra já no lugar (a porta em
   *   tela cheia por um instante e a casca logo depois era um piscar a cada entrada);
   * - sem vinculação → a porta, em tela cheia por cima de tudo (`Portal` no `body`: dentro da
   *   área de conteúdo ela ficaria presa à animação de troca de tela);
   * - vinculado → a tela.
   *
   * `data.user` vem da guarda em `(app)/+layout.ts`, um nível acima.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const needsGithub = $derived(requiresSystemGithub(data.user));
  /* A conferência nasce uma vez, com quem entrou: a sessão não muda sem recarregar a tela. */
  const user = untrack(() => data.user);
  const github = useGithubConnectionModel(user.id, requiresSystemGithub(user));
</script>

{#if !needsGithub || github.state.isLinked}
  {@render children()}
{:else if !github.state.isLoading}
  <Portal>
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <GithubLinkGate state={github.state} actions={github.actions} />
    </div>
  </Portal>
{/if}
