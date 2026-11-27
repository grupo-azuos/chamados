<!--
  @component
  O TOKEN DO AGENTE, mostrado uma única vez — com as três saídas para levar ele ao PC novo.

  Esta tela existe porque o token não pode ser pedido de novo: o banco guarda só o hash dele, como
  senha. Se a pessoa fechar sem guardar, o caminho é gerar outro — e é isso que o texto diz.

  Mostra o código e o comando do PowerShell, cada um com o seu botão de copiar ao lado, dentro da
  própria caixa (`AzuosCopyButton`: ícone, dica, ✓ "Copiado!" por um instante; sem área de
  transferência, nada quebra e o texto continua ali para copiar à mão). Embaixo, "Baixar
  instalador (.zip)" — o pacote com o MSI, o certificado, os scripts e o `instalar.cmd`, que é só
  descompactar e dar dois cliques. O botão do zip só aparece quando `onDownloadBundle` é passada.
  "Já guardei" fecha.

  Função pura de props: recebe o token e avisa quando foi fechada ou quando o zip foi pedido. Não
  busca nada e não guarda nada.

  - `data`: `computerName` e `token`.
  - `state`: `isOpen`, `isDownloadingBundle` e `bundleError`.
  - `actions`: `onClose` e `onDownloadBundle` (opcional).
-->
<script lang="ts" module>
  /**
   * O TOKEN DO AGENTE, mostrado uma única vez.
   *
   * Esta tela existe porque o token não pode ser pedido de novo: o banco guarda só o hash
   * dele, como senha. Se a pessoa fechar sem copiar, o caminho é gerar outro — e é isso que
   * o texto diz, em vez de deixá-la procurar um botão de "ver token" que nunca vai existir.
   */
  export type AzuosComputerTokenDialogProps = {
    data: { computerName: string; token: string };
    state?: { isOpen?: boolean; isDownloadingBundle?: boolean; bundleError?: string | null };
    actions: {
      onClose: () => void;
      /** Baixa o zip de instalação com este token dentro. Sem ela, o botão não aparece. */
      onDownloadBundle?: () => void;
    };
  };

  /** O comando que o install-agent.ps1 entende — o mesmo que vai escrito na tela. */
  export function installCommand(token: string): string {
    return `.\\install-agent.ps1 -Token '${token}'`;
  }
</script>

<script lang="ts">
  import Download from '@lucide/svelte/icons/download';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import CopyButton from '$lib/components/azuos-copy-button/azuos-copy-button.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';

  /* O prop precisa de outro nome aqui dentro: um binding local chamado `state` faz o
     compilador ler `$state(...)` como inscrição numa store `state`, em vez da rune. */
  let { data, state: dialogState, actions }: AzuosComputerTokenDialogProps = $props();
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-xl">
    <!-- O cabeçalho da casa: título e descrição, sem selo de ícone desenhado à mão. -->
    <DialogHeader>
      <DialogTitle class="break-words">Token de {data.computerName}</DialogTitle>
      <DialogDescription>
        Guarde agora: por segurança, este código não pode ser mostrado de novo. Se perder, gere
        outro pela ficha da máquina.
      </DialogDescription>
    </DialogHeader>

    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-sm font-medium text-muted-foreground">Código da máquina</span>
      <!-- O botão mora dentro da caixa, à direita e no meio da altura: o código é uma linha só. -->
      <!-- O bloco cinza da casa, como o do comando logo abaixo: caixa escura é faixa escura. -->
      <div class="rounded-box bg-muted flex min-w-0 items-center gap-2 py-2 pr-2 pl-4">
        <span
          class="text-foreground min-w-0 flex-1 py-2 font-mono text-xs break-all select-all"
          data-testid="agent-token"
        >
          {data.token}
        </span>
        <CopyButton data={{ text: data.token, label: 'Copiar código' }} />
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-sm font-medium text-muted-foreground">Comando no PowerShell</span>
      <!-- O comando quebra em várias linhas: o botão fica no canto de cima, e o texto deixa a
           faixa da direita livre para ele. -->
      <div class="relative min-w-0 rounded-box bg-muted">
        <code
          class="block min-w-0 p-3 pr-12 font-mono text-xs break-all whitespace-normal text-foreground select-all"
          data-testid="agent-command"
        >
          {installCommand(data.token)}
        </code>
        <CopyButton
          data={{ text: installCommand(data.token), label: 'Copiar comando' }}
          ui={{ className: 'absolute top-1.5 right-1.5' }}
        />
      </div>
    </div>

    <!-- O instalador: secundário, porque a ação principal é "Já guardei". -->
    {#if actions.onDownloadBundle}
      <ActionButton
        data={{ label: 'Baixar instalador (.zip)', loadingLabel: 'Montando o instalador…' }}
        ui={{ variant: 'secondary', icon: Download, className: 'w-full justify-center' }}
        state={{ isLoading: dialogState?.isDownloadingBundle ?? false }}
        actions={{ onClick: () => actions.onDownloadBundle?.() }}
      />
    {/if}

    {#if actions.onDownloadBundle}
      <p class="text-sm text-muted-foreground">
        O instalador já leva este token. No computador novo, descompacte o .zip e dê dois cliques
        em <span class="font-medium text-foreground">instalar.cmd</span> — a máquina conecta
        sozinha e aparece aqui com a ficha completa.
      </p>
    {/if}

    {#if dialogState?.bundleError}
      <p role="alert" class="text-sm text-destructive">{dialogState.bundleError}</p>
    {/if}

    <DialogFooter>
      <ActionButton
        data={{ label: 'Já guardei' }}
        ui={{ className: 'w-full justify-center sm:w-auto' }}
        actions={{ onClick: actions.onClose }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
