<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CopyButton from './azuos-copy-button.svelte';

  /* Código INVENTADO: nenhum token que funcione entra num arquivo versionado. */
  const TOKEN = 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4';

  const { Story } = defineMeta({
    title: 'Components/AzuosCopyButton',
    component: CopyButton,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { text: TOKEN, label: 'Copiar código' } }} />

<!-- Dentro da caixa cinza, no canto de cima de um comando de várias linhas. -->
<Story name="Inside a box" asChild>
  <div class="relative max-w-md rounded-box bg-muted p-3 pr-12 font-mono text-xs break-all text-foreground">
    .\install-agent.ps1 -Token '{TOKEN}'
    <CopyButton
      data={{ text: `.\\install-agent.ps1 -Token '${TOKEN}'`, label: 'Copiar comando' }}
      ui={{ className: 'absolute top-2 right-2' }}
    />
  </div>
</Story>

<!-- Tom invertido: sobre a caixa escura do token (que vira clara no tema escuro). -->
<Story name="Inverse tone" asChild>
  <div
    class="flex max-w-md items-center gap-2 rounded-box bg-foreground p-4 font-mono text-xs break-all text-background"
  >
    <span class="min-w-0 flex-1">{TOKEN}</span>
    <CopyButton data={{ text: TOKEN, label: 'Copiar código' }} ui={{ tone: 'inverse' }} />
  </div>
</Story>

<!-- CASO LIMITE: rótulo comprido na dica — ela quebra a linha em vez de passar da tela. -->
<Story
  name="Long label"
  args={{ data: { text: TOKEN, label: 'Copiar o código de instalação desta máquina para colar no PowerShell' } }}
/>
