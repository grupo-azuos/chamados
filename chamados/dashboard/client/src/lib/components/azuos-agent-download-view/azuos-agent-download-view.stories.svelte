<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';
  import AgentDownloadView from './azuos-agent-download-view.svelte';
  const { Story } = defineMeta({
    title: 'Features/Agent/AzuosAgentDownloadView',
    component: AgentDownloadView,
  });
  const data = {
    release: { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 45_000_000 },
  };
  const state = { isLoading: false, error: null, downloadError: null, downloading: null };
  const actions = { onRetry: fn(), onDownload: fn(), onDownloadInstallerScript: fn() };
</script>

<Story name="Default" args={{ data, state, actions }} />
<Story
  name="Loading"
  args={{ data: { release: null }, state: { ...state, isLoading: true }, actions }}
/>
<Story name="Empty" args={{ data: { release: null }, state, actions }} />
<Story
  name="LoadFailed"
  args={{
    data: { release: null },
    state: { ...state, error: 'Não consegui consultar a versão. Tente novamente em instantes.' },
    actions,
  }}
/>
<Story name="PreparingDownload" args={{ data, state: { ...state, downloading: 'msi' }, actions }} />
<Story
  name="DownloadFailed"
  args={{
    data,
    state: {
      ...state,
      downloadError: 'A versão disponível mudou. Atualize a página antes de baixar os arquivos.',
    },
    actions,
  }}
/>
<Story name="Narrow" args={{ data, state, actions }}>
  {#snippet template(args: ComponentProps<typeof AgentDownloadView>)}
    <div class="w-full max-w-sm"><AgentDownloadView {...args} /></div>
  {/snippet}
</Story>
