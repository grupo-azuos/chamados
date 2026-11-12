<script lang="ts" module>
  import {
    ATTACHMENT_KINDS,
    ATTACHMENT_RULES,
    attachmentAccept,
    attachmentKindOf,
    megabytesOf,
    refuseAttachment,
    type AttachmentKind,
  } from '@template/shared/domain/attachment-catalog.util';

  export type AzuosAttachmentPickerProps = {
    data: {
      /** Os arquivos já escolhidos, ainda não enviados. */
      files: File[];
      /**
       * De que grupo são os arquivos que o chamado JÁ TEM. A conta do limite soma os dois:
       * quem já mandou dois vídeos não pode escolher um terceiro aqui.
       */
      existingKinds?: AttachmentKind[];
    };
    ui?: {
      /**
       * Desliga o Ctrl+V. Só para a tela que já usa o colar para outra coisa (o print da
       * abertura do chamado): duas escutas no mesmo colar anexariam o print duas vezes.
       */
      isPasteDisabled?: boolean;
    };
    state?: {
      isDisabled?: boolean;
      /** A recusa da última escolha, em português, vinda do domínio. */
      error?: string | null;
    };
    actions: {
      onChange: (files: File[]) => void;
      onError: (message: string | null) => void;
    };
  };

  /** A linha que resume o que cabe, para a pessoa saber antes de tentar. */
  export function limitsSummary(): string {
    return ATTACHMENT_KINDS.map((kind) => {
      const rule = ATTACHMENT_RULES[kind];

      return `${rule.maxCount} ${rule.label} de até ${megabytesOf(rule.maxBytes)}`;
    }).join(' · ');
  }

  /**
   * Julga os arquivos escolhidos contra o que já existe e o que já foi escolhido.
   *
   * A mesma função que a API usa para recusar (`refuseAttachment`): é o que garante que a tela
   * não aceite algo que o envio vai devolver, nem recuse algo que passaria.
   *
   * Para no PRIMEIRO problema, e não acumula uma lista: quem escolheu cinco arquivos errados
   * conserta um de cada vez, e cinco frases de erro de uma vez não ajudam ninguém.
   */
  export function reviewChoice(
    chosen: readonly File[],
    already: readonly File[],
    existingKinds: readonly AttachmentKind[],
  ): { accepted: File[]; error: string | null } {
    const kinds: AttachmentKind[] = [
      ...existingKinds,
      ...already.map((file) => attachmentKindOf(file.type, file.name)).filter(isKind),
    ];

    const accepted: File[] = [];
    /* Uma lista, e não um `Set`: a regra de lint do Svelte recusa as coleções nativas em
       arquivo de componente, e aqui são poucos arquivos — procurar num punhado é instantâneo
       e se lê melhor do que a estrutura de dados. */
    const seen: string[] = already.map(identityOf);

    for (const file of chosen) {
      /**
       * O MESMO ARQUIVO DE NOVO É RECUSADO — e isso já derrubou a tela.
       *
       * Escolher a mesma nota duas vezes é um clique a mais, não uma intenção: subiria o
       * arquivo duplicado, pagaria o dobro de armazenamento e ocuparia duas vagas da cota.
       * Pior: a lista abaixo é desenhada por `nome + tamanho`, e dois iguais davam CHAVE
       * REPETIDA — o que não desenha torto, derruba a tela inteira.
       *
       * Dois arquivos de mesmo nome vindos de pastas diferentes continuam passando: eles
       * quase nunca têm o mesmo tamanho e a mesma data de modificação.
       */
      if (seen.includes(identityOf(file))) {
        return { accepted, error: `${file.name} já está na lista.` };
      }

      const refusal = refuseAttachment(
        { contentType: file.type, fileName: file.name, sizeBytes: file.size },
        kinds,
      );
      if (refusal) return { accepted, error: refusal.message };

      const kind = attachmentKindOf(file.type, file.name);
      if (kind) kinds.push(kind);
      seen.push(identityOf(file));
      accepted.push(file);
    }

    return { accepted, error: null };
  }

  /**
   * O que identifica um arquivo escolhido, sem ler os bytes dele.
   *
   * Nome, tamanho e data de modificação: é o mais perto de "é o mesmo arquivo" que dá para
   * saber sem abrir o conteúdo — e abrir megabytes de vídeo só para comparar seria pagar caro
   * por uma certeza que ninguém precisa aqui.
   *
   * Exportada porque é a MESMA chave que a lista usa para desenhar: se as duas divergirem, a
   * recusa deixa passar um caso que a lista não sabe desenhar, e a tela cai.
   */
  export function identityOf(file: File): string {
    return `${file.name}::${file.size}::${file.lastModified}`;
  }

  /**
   * Os arquivos que vieram na área de transferência. O print colado chega sempre como
   * "image.png", e dois prints seguidos virariam o mesmo nome na lista — por isso a imagem sem
   * nome de verdade ganha um com a hora e a posição.
   */
  export function pastedFiles(clipboard: DataTransfer | null, now: Date = new Date()): File[] {
    const time = now.toTimeString().slice(0, 8).replaceAll(':', '-');

    return Array.from(clipboard?.files ?? []).map((file, index) => {
      if (!isGenericClipboardName(file.name)) return file;

      const extension = file.type.split('/')[1] ?? 'png';
      const suffix = index > 0 ? `-${index + 1}` : '';

      return new File([file], `print-colado-${time}${suffix}.${extension}`, {
        type: file.type,
        lastModified: now.getTime(),
      });
    });
  }

  /* O nome que o navegador dá a uma imagem que não veio de arquivo nenhum (print, cópia de
     imagem da web). Arquivo copiado do explorador mantém o nome original. */
  function isGenericClipboardName(name: string): boolean {
    return name === '' || /^image\.[a-z]+$/i.test(name);
  }

  function isKind(value: AttachmentKind | null): value is AttachmentKind {
    return value !== null;
  }
</script>

<script lang="ts">
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { fileSizeOf } from '$lib/components/azuos-attachment-list/azuos-attachment-list.svelte';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import X from '@lucide/svelte/icons/x';

  let { data, ui, state: pickerState, actions }: AzuosAttachmentPickerProps = $props();

  /* Puramente visual: o `<input type="file">` não deixa tirar um arquivo da seleção por
     código sem limpar o campo inteiro, então ele é zerado a cada escolha e quem guarda a
     lista é o view-model. */
  let input: HTMLInputElement | undefined = $state();

  const isDisabled = $derived(pickerState?.isDisabled === true);

  function choose(event: Event) {
    const chosen = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
    if (input) input.value = '';
    accept(chosen);
  }

  /**
   * Colar com Ctrl+V: o print (PrtSc, Win+Shift+S) e o arquivo copiado do explorador entram
   * na lista como se tivessem sido escolhidos. Vale com o foco em qualquer lugar da tela —
   * inclusive no texto do histórico. Colar TEXTO segue normal: sem arquivo na área de
   * transferência, o colar não é tocado.
   */
  function handlePaste(event: ClipboardEvent) {
    if (ui?.isPasteDisabled || isDisabled || event.defaultPrevented) return;

    const pasted = pastedFiles(event.clipboardData);
    if (pasted.length === 0) return;

    event.preventDefault();
    accept(pasted);
  }

  function accept(chosen: File[]) {
    if (chosen.length === 0) return;

    const review = reviewChoice(chosen, data.files, data.existingKinds ?? []);

    actions.onError(review.error);
    if (review.accepted.length > 0) actions.onChange([...data.files, ...review.accepted]);
  }

  function drop(file: File) {
    actions.onError(null);
    actions.onChange(data.files.filter((chosen) => chosen !== file));
  }
</script>

<svelte:window onpaste={handlePaste} />

<!--
  `relative` NÃO É ENFEITE, e foi um defeito de verdade.

  O `<input type="file">` abaixo é `sr-only`, e `sr-only` é `position: absolute`. Sem um
  ancestral posicionado, ele se ancorava no PAINEL DO DIÁLOGO — ou seja, no canto superior
  esquerdo da janela inteira, a centenas de pixels do rótulo que o aciona.

  Quando o seletor de arquivos do sistema fechava, o navegador devolvia o foco ao campo e o
  rolava para dentro da vista. Como ele estava ancorado no painel, quem rolava era o PAINEL:
  o cabeçalho do chamado saía por cima, sobrava um vazio embaixo do rodapé, e não havia como
  desfazer — o painel é `overflow-hidden`, então não existe barra de rolagem para voltar.

  Com `relative` aqui, o campo passa a morar onde o rótulo está. Rolá-lo para dentro da vista
  vira uma operação sem efeito, porque ele já está visível.
-->
<div class="relative flex flex-col gap-2">
  <label
    class="border-input hover:bg-muted/50 control-lg flex cursor-pointer items-center gap-2 rounded-control border border-dashed text-sm"
    class:pointer-events-none={isDisabled}
    class:opacity-60={isDisabled}
    for="attachments"
  >
    <Paperclip class="text-ink-500 size-4 shrink-0" />
    <span class="text-ink-700">Escolher arquivos</span>
  </label>

  <input
    bind:this={input}
    id="attachments"
    class="sr-only"
    type="file"
    multiple
    accept={attachmentAccept()}
    disabled={isDisabled}
    onchange={choose}
  />

  <p class="text-ink-500 text-xs">{limitsSummary()}</p>
  {#if !ui?.isPasteDisabled}
    <p class="text-ink-500 text-xs">Também dá para colar um print ou arquivo com Ctrl+V.</p>
  {/if}

  {#if pickerState?.error}
    <p class="text-destructive text-xs" role="alert">{pickerState.error}</p>
  {/if}

  {#if data.files.length > 0}
    <ul class="divide-y rounded-box border">
      <!-- A chave leva a POSIÇÃO junto com a identidade do arquivo. A recusa acima já barra o
           mesmo arquivo duas vezes, mas chave repetida num `each` derruba a tela inteira — e
           nenhuma lista de anexos vale uma tela em branco. Cinto e suspensório, de propósito. -->
      {#each data.files as file, index (`${identityOf(file)}-${index}`)}
        <li class="flex items-center justify-between gap-2 p-2">
          <div class="min-w-0">
            <p class="text-ink-900 truncate text-sm">{file.name}</p>
            <p class="text-ink-500 text-xs">{fileSizeOf(file.size)}</p>
          </div>

          <ActionButton
            data={{ label: 'Tirar' }}
            ui={{ variant: 'ghost', size: 'sm', icon: X, isIconOnly: true }}
            state={{ isDisabled }}
            actions={{ onClick: () => drop(file) }}
          />
        </li>
      {/each}
    </ul>
  {/if}
</div>
