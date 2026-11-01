<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Paperclip from '@lucide/svelte/icons/paperclip';

  import FileLinks from './azuos-file-links.svelte';

  const data = {
    fileName: 'orcamento-fonte.pdf',
    viewUrl: '#',
    downloadUrl: '#',
  };

  const { Story } = defineMeta({
    title: 'Components/AzuosFileLinks',
    component: FileLinks,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data }} />

<!-- O nome do arquivo como texto, com o clipe antes. -->
<Story name="WithFileName" args={{ data: { ...data, openLabel: data.fileName }, ui: { openIcon: Paperclip } }} />

<!-- Caso limite: nome comprido numa coluna estreita — corta com "…". -->
<Story name="LongNameNarrow" asChild>
  <div class="w-48">
    <FileLinks
      data={{ ...data, fileName: 'relatorio-de-manutencao-preventiva-outubro.pdf', openLabel: 'relatorio-de-manutencao-preventiva-outubro.pdf' }}
      ui={{ openIcon: Paperclip }}
    />
  </div>
</Story>
