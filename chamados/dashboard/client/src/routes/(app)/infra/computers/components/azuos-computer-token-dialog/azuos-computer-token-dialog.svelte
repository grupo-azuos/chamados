<!--
  @component
  O TOKEN DO AGENTE, mostrado uma única vez — com as três saídas para levar ele ao PC novo.

  Esta tela existe porque o token não pode ser pedido de novo: o banco guarda só o hash dele, como
  senha. Se a pessoa fechar sem guardar, o caminho é gerar outro — e é isso que o texto diz.

  Mostra o código e o comando do PowerShell, e embaixo as três ações: "Copiar código",
  "Copiar comando" e "Baixar instalador (.zip)" — o pacote com o MSI, o certificado, os scripts e
  o `instalar.cmd`, que é só descompactar e dar dois cliques. O botão do zip só aparece quando
  `onDownloadBundle` é passada. Ao copiar, o botão vira "Copiado!" por um instante. Sem área de
  transferência, nada quebra: o token continua escrito para copiar à mão. "Já guardei" fecha.

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

  /** Quanto tempo o "Copiado!" fica no botão antes de ele voltar ao rótulo de sempre. */
  const COPIED_FEEDBACK_MS = 2000;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';
  import Download from '@lucide/svelte/icons/download';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import SquareTerminal from '@lucide/svelte/icons/square-terminal';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
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

  /* Estado puramente visual — qual botão mostra "Copiado!" agora. Não é dado de domínio, e
     por isso pode morar dentro do componente (CONTRIBUTING §3). */
  let copied = $state<'token' | 'command' | null>(null);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => clearTimeout(resetTimer));

  async function copy(what: 'token' | 'command'): Promise<void> {
    const text = what === 'token' ? data.token : installCommand(data.token);
    /* Navegador sem área de transferência (ou sem permissão) não pode quebrar a tela: o
       token continua escrito na frente da pessoa, que seleciona e copia à mão. */
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      copied = null;
      return;
    }
    copied = what;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => (copied = null), COPIED_FEEDBACK_MS);
  }
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-xl">
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-icon bg-primary text-primary-foreground"
        >
          <KeyRound class="size-4" aria-hidden="true" />
        </span>
        <DialogTitle class="min-w-0 break-words pr-8 text-lg font-semibold tracking-tight">
          Token de {data.computerName}
        </DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">
        Guarde agora: por segurança, este código não pode ser mostrado de novo. Se perder, gere
        outro pela ficha da máquina.
      </DialogDescription>
    </DialogHeader>

    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-sm font-medium text-muted-foreground">Código da máquina</span>
      <div
        class="min-w-0 rounded-box bg-foreground p-4 font-mono text-xs tracking-wider break-all text-background select-all"
        data-testid="agent-token"
      >
        {data.token}
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-sm font-medium text-muted-foreground">Comando no PowerShell</span>
      <code
        class="block min-w-0 rounded-box bg-muted p-3 font-mono text-xs break-all whitespace-normal text-foreground select-all"
        data-testid="agent-command"
      >
        {installCommand(data.token)}
      </code>
    </div>

    <!-- As três saídas do token: todas secundárias, porque a principal é "Já guardei". As duas de
         copiar dividem a fileira; o instalador ganha a dele, para o rótulo caber inteiro. -->
    <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label="Levar o token para o computador">
      <ActionButton
        data={{ label: copied === 'token' ? 'Copiado!' : 'Copiar código' }}
        ui={{ variant: 'secondary', icon: copied === 'token' ? Check : Copy, className: 'w-full justify-center' }}
        actions={{ onClick: () => void copy('token') }}
      />
      <ActionButton
        data={{ label: copied === 'command' ? 'Copiado!' : 'Copiar comando' }}
        ui={{
          variant: 'secondary',
          icon: copied === 'command' ? Check : SquareTerminal,
          className: 'w-full justify-center',
        }}
        actions={{ onClick: () => void copy('command') }}
      />
      {#if actions.onDownloadBundle}
        <ActionButton
          data={{ label: 'Baixar instalador (.zip)', loadingLabel: 'Montando o instalador…' }}
          ui={{ variant: 'secondary', icon: Download, className: 'w-full justify-center sm:col-span-2' }}
          state={{ isLoading: dialogState?.isDownloadingBundle ?? false }}
          actions={{ onClick: () => actions.onDownloadBundle?.() }}
        />
      {/if}
    </div>

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
