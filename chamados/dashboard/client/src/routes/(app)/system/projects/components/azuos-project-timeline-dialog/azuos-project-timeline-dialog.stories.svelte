<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ProjectTimelineDialog from './azuos-project-timeline-dialog.svelte';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  const mockProject: SoftwareProject = {
    id: 1,
    name: 'Azuos Ticket',
    description: 'Sistema de suporte e chamados',
    repositoryUrl: 'grupo-azuos/chamados',
    githubRepoOwner: 'vinicius-gpl',
    githubRepoName: 'azuos-ticket',
    responsibleId: null,
    responsibleName: null,
    status: 'active',
    color: 'blue',
    openTicketsCount: 2,
    pullRequestsCount: 10,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  const { Story } = defineMeta({
    title: 'Features/System/AzuosProjectTimelineDialog',
    component: ProjectTimelineDialog,
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      project: mockProject,
      items: [],
    },
    state: {
      isOpen: true,
      isLoading: false,
      error: null,
    },
    actions: {
      onClose: fn(),
    },
  }}
/>
