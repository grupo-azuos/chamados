<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ComputerTokenDialog from './azuos-computer-token-dialog.svelte';

  /* Token INVENTADO: nenhum código que funcione entra num arquivo versionado. */
  const TOKEN = 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4';

  const actions = { onClose: () => {}, onDownloadBundle: () => {} };

  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosComputerTokenDialog',
    component: ComputerTokenDialog,
  });
</script>

<Story
  name="Default"
  args={{ data: { computerName: 'RECEPCAO-01', token: TOKEN }, actions }}
/>

<!-- Fechado: o diálogo só existe no instante seguinte ao cadastro. -->
<Story
  name="Closed"
  args={{ data: { computerName: 'RECEPCAO-01', token: TOKEN }, state: { isOpen: false }, actions }}
/>

<!-- CASO LIMITE: nome de máquina comprido no título, que não pode empurrar o botão de fechar. -->
<Story
  name="Long machine name"
  args={{
    data: { computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA', token: TOKEN },
    actions,
  }}
/>

<!-- Montando o zip: o botão fica ocupado até o arquivo chegar. -->
<Story
  name="Building package"
  args={{ data: { computerName: 'RECEPCAO-01', token: TOKEN }, state: { isDownloadingBundle: true }, actions }}
/>

<!-- Falha ao montar o pacote: o motivo aparece, e o token continua na tela. -->
<Story
  name="Package failed"
  args={{
    data: { computerName: 'RECEPCAO-01', token: TOKEN },
    state: { bundleError: 'Faltam arquivos desta versão do agente. Avise a Infraestrutura.' },
    actions,
  }}
/>
