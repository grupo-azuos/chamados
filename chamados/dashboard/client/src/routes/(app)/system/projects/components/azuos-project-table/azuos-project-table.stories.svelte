<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { fn } from 'storybook/test';

  import Component from './azuos-project-table.svelte';

  const { Story } = defineMeta({
    title: 'Features/Projects/AzuosProjectTable',
    component: Component,
    tags: ['autodocs'],
  });

  const project: SoftwareProject = {
    id: 1,
    name: 'Portal do Cliente',
    description: 'Onde o cliente acompanha os pedidos.',
    repositoryUrl: 'https://github.com/exemplo/portal',
    githubRepoOwner: 'exemplo',
    githubRepoName: 'portal',
    responsibleId: 'person-ana',
    responsibleName: 'Ana Lima',
    status: 'active',
    color: 'blue',
    openTicketsCount: 3,
    pullRequestsCount: 7,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    archive: null,
  };
  const menuItems = [
    { id: 'sync', label: 'Sincronizar' },
    { id: 'edit', label: 'Editar', separatorBefore: true },
    { id: 'delete', label: 'Excluir', isDestructive: true },
  ];
  const actions = { onOpen: fn(), onMenuSelect: fn() };
</script>

<Story name="Default" args={{ data: { items: [project], menuItems }, actions }} />
<!-- Legado e sem responsável, lado a lado com um ativo. -->
<Story
  name="Variantes"
  args={{ data: { items: [project, { ...project, id: 2, name: 'ERP antigo', status: 'deprecated', responsibleId: null, responsibleName: null }], menuItems }, actions }}
/>
<!-- Quem só consulta: sem menu. -->
<Story name="SemMenu" args={{ data: { items: [project], menuItems: [] }, actions }} />
<!-- Sincronizando: o menu travado. -->
<Story name="Sincronizando" args={{ data: { items: [project], menuItems }, state: { isMenuDisabled: true }, actions }} />
<!-- Nome comprido: quebra em vez de alargar a tabela. -->
<Story name="NomeLongo" args={{ data: { items: [{ ...project, name: 'Sistema de acompanhamento de contratos e aditivos dos fornecedores do grupo' }], menuItems }, actions }} />
