<script lang="ts">
  import type { Snippet } from 'svelte';

  import { page } from '$app/state';
  import AppShell from '$lib/components/azuos-app-shell/azuos-app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell.svelte';
  import { useAreaContextModel } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import { useNavigationStackRecorder } from '$lib/hooks/use-navigation-stack/use-navigation-stack.svelte';
  import { contextOfPath, NAV_ITEMS_BY_CONTEXT } from '$lib/navigation/navigation';
  import type { LayoutData } from './$types';

  /**
   * A CASCA DO PAINEL INTERNO — montada UMA vez, aqui, como o `__root` dos sistemas em React.
   *
   * Antes cada módulo (`infra`, `system`, `maintenance`) e as telas da pessoa (`profile`,
   * `roles`) montavam a própria casca no próprio `+layout.svelte`. O SvelteKit desmonta o
   * layout de uma pasta ao sair dela: trocar de módulo no trilho, abrir o perfil ou voltar dele
   * destruía a barra inteira e a criava de novo — a tela toda piscava, em vez de só o conteúdo
   * mudar. Agora a barra fica, e só o menu e a área de conteúdo trocam.
   *
   * O MENU CONTINUA SENDO DO MÓDULO DO ENDEREÇO: `/infra/...` mostra a lista da
   * Infraestrutura, e nenhuma outra. Não há filtro de lista única pelo que está guardado no
   * navegador (o que fazia um módulo se achar dono do sistema inteiro): o contexto sai do
   * endereço, e a lista sai do mapa fixo `NAV_ITEMS_BY_CONTEXT`. Só nas telas que não são de
   * módulo nenhum (o perfil, os cargos) vale o ÚLTIMO contexto usado — é o menu que a pessoa
   * espera continuar vendo ao voltar.
   *
   * A sessão já foi conferida pela guarda em `+layout.ts` quando qualquer coisa daqui roda.
   */
  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  /* A pilha do "voltar" é gravada aqui, uma vez, para as telas logadas dos três módulos. */
  useNavigationStackRecorder();

  const lastContext = useAreaContextModel();
  const context = $derived(contextOfPath(page.url.pathname) ?? lastContext.context);

  const shell = useAppShellModel({
    get user() {
      return data.user;
    },
    get context() {
      return context;
    },
    get items() {
      return NAV_ITEMS_BY_CONTEXT[context];
    },
  });
</script>

<AppShell
  initialSidebarOpen={data.sidebarOpen}
  data={shell.data}
  ui={shell.ui}
  state={shell.state}
  actions={shell.actions}
>
  {@render children()}
</AppShell>
