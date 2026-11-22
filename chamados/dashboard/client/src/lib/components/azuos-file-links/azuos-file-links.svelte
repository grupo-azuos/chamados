<!--
  @component
  Os dois caminhos para um arquivo anexado: ABRIR mostra numa aba nova (quem está conferindo quer
  olhar o print sem encher a pasta de downloads) e BAIXAR salva com o nome original (quem vai mandar
  para o fornecedor precisa do arquivo).

  No padrão Apple os dois são PÍLULAS CINZA iguais, cada uma com o seu ícone e o seu verbo — nada de
  um link azul solto ao lado de um ícone sem nome. Duas formas:

  - `inline` (padrão): só as duas pílulas, para a linha de tabela e de lista.
  - `card`: a linha do arquivo inteira — o ícone do tipo (PDF vermelho, planilha verde, imagem
    roxa), o nome e o tipo embaixo, e as duas pílulas à direita. Com `actions.onRemove`, ganha a
    lixeira no fim, em vermelho (perigo). É a linha do `AzuosAttachmentList`.

  `rel="noopener noreferrer"` porque o endereço assinado não deve viajar como referência.

  Props: `data` traz o nome do arquivo, os endereços de abrir e baixar, o texto do abrir, o tamanho
  e o detalhe; `ui` traz a forma (`layout`) e o ícone do abrir; `state.isRemoving` mostra a remoção
  em andamento; `actions.onRemove` liga a lixeira.
-->
<script lang="ts" module>
  import Download from '@lucide/svelte/icons/download';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import File from '@lucide/svelte/icons/file';
  import FileImage from '@lucide/svelte/icons/file-image';
  import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
  import FileText from '@lucide/svelte/icons/file-text';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import type { LucideIcon } from '@lucide/svelte';

  import { type AzuosCardTone, cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  export type AzuosFileLinksProps = {
    data: {
      /** O nome do arquivo: vai no nome acessível dos dois links, no arquivo salvo e no `card`. */
      fileName: string;
      viewUrl: string;
      downloadUrl: string;
      /** O texto do abrir ("Abrir", "Ver PDF"). @default 'Abrir' */
      openLabel?: string;
      /** O tamanho já escrito ("1,2 MB"), mostrado no `card` ao lado do tipo. */
      sizeLabel?: string;
      /** A linha de baixo do `card` ("Enviado por Ana · 12/11"). Sem ela, o tipo e o tamanho. */
      detail?: string;
    };
    ui?: {
      layout?: 'inline' | 'card';
      openIcon?: LucideIcon;
      className?: string;
    };
    state?: { isRemoving?: boolean };
    actions?: { onRemove?: () => void };
  };

  type FileKind = { icon: LucideIcon; tone: AzuosCardTone; label: string };

  const KINDS: { match: RegExp; kind: FileKind }[] = [
    { match: /\.pdf$/i, kind: { icon: FileText, tone: 'red', label: 'PDF' } },
    { match: /\.(xlsx?|csv|ods)$/i, kind: { icon: FileSpreadsheet, tone: 'green', label: 'Planilha' } },
    { match: /\.(png|jpe?g|gif|webp|heic|svg)$/i, kind: { icon: FileImage, tone: 'plum', label: 'Imagem' } },
    { match: /\.(docx?|odt|txt|rtf)$/i, kind: { icon: FileText, tone: 'blue', label: 'Documento' } },
  ];

  const OTHER_KIND: FileKind = { icon: File, tone: 'slate', label: 'Arquivo' };

  /** O tipo do arquivo pela extensão: o ícone, o tom e o nome. */
  export function fileKindOf(fileName: string): FileKind {
    return KINDS.find((item) => item.match.test(fileName))?.kind ?? OTHER_KIND;
  }

  const PILL =
    'inline-flex control-sm shrink-0 items-center gap-1.5 rounded-button bg-muted px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

</script>

<script lang="ts">
  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';

  let { data, ui, state: fileState, actions }: AzuosFileLinksProps = $props();

  const OpenIcon = $derived(ui?.openIcon ?? ExternalLink);
  const kind = $derived(fileKindOf(data.fileName));
  const details = $derived(data.detail ?? [kind.label, data.sizeLabel].filter(Boolean).join(' · '));
</script>

{#snippet pills(className: string)}
  <div class={cn('flex min-w-0 items-center gap-1.5', className)}>
    <a
      href={data.viewUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir ${data.fileName}`}
      title={`Abrir ${data.fileName}`}
      class={cn(PILL, 'min-w-0 shrink')}
    >
      <OpenIcon class="text-primary size-4 shrink-0" aria-hidden="true" />
      <span class="truncate">{data.openLabel ?? 'Abrir'}</span>
    </a>
    <a
      href={data.downloadUrl}
      download={data.fileName}
      rel="noopener noreferrer"
      aria-label={`Baixar ${data.fileName}`}
      title={`Baixar ${data.fileName}`}
      class={PILL}
    >
      <Download class="text-primary size-4 shrink-0" aria-hidden="true" />
      Baixar
    </a>
  </div>
{/snippet}

{#if ui?.layout === 'card'}
  <div
    data-slot="file-card"
    class={cn(
      'rounded-surface bg-card shadow-card flex min-w-0 flex-wrap items-center gap-3 p-3',
      ui?.className,
    )}
  >
    <span
      class={cn(
        'rounded-icon flex size-10 shrink-0 items-center justify-center',
        cardToneClasses(kind.tone).dot,
      )}
    >
      <kind.icon class="size-5" aria-hidden="true" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="text-foreground truncate text-sm font-semibold" title={data.fileName}>
        {data.fileName}
      </span>
      <span class="text-muted-foreground text-xs">{details}</span>
    </span>
    <span class="flex shrink-0 items-center gap-1.5">
      {@render pills('')}
      {#if actions?.onRemove}
        <AzuosActionButton
          data={{ label: `Excluir ${data.fileName}` }}
          ui={{ variant: 'danger-soft', size: 'sm', icon: Trash2, isIconOnly: true }}
          state={{ isLoading: fileState?.isRemoving }}
          actions={{ onClick: actions.onRemove }}
        />
      {/if}
    </span>
  </div>
{:else}
  {@render pills(ui?.className ?? '')}
{/if}
