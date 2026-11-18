<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * Os dois caminhos para um arquivo anexado: ABRIR mostra numa aba nova (quem está conferindo
   * quer olhar o arquivo sem encher a pasta de downloads) e BAIXAR salva com o nome original
   * (quem vai mandar adiante precisa do arquivo).
   *
   * O abrir é o texto, porque é o que se faz quase sempre; o baixar é o ícone ao lado, na régua
   * dos outros botões de linha. Arquivo que o navegador não sabe mostrar (Word, Excel) acaba
   * baixado pelo abrir também — isso é do navegador, não daqui.
   *
   * `rel="noopener noreferrer"` porque o endereço assinado não deve viajar como referência.
   */
  export type AzuosFileLinksProps = {
    data: {
      /** O nome do arquivo: vai no nome acessível dos dois links e no arquivo salvo. */
      fileName: string;
      viewUrl: string;
      downloadUrl: string;
      /** O texto do link de abrir. Sem ele, "Abrir". */
      openLabel?: string;
    };
    ui?: {
      /** Um ícone antes do texto de abrir — o clipe, quando o texto é o próprio nome do arquivo. */
      openIcon?: LucideIcon;
      className?: string;
    };
  };
</script>

<script lang="ts">
  import Download from '@lucide/svelte/icons/download';

  import { actionButton } from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosFileLinksProps = $props();

  const OpenIcon = $derived(ui?.openIcon);
</script>

<div class={cn('flex min-w-0 items-center gap-1', ui?.className)}>
  <a
    href={data.viewUrl}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Abrir ${data.fileName}`}
    title={`Abrir ${data.fileName}`}
    class="text-primary inline-flex min-h-10 min-w-0 items-center gap-1.5 text-sm font-semibold hover:underline"
  >
    {#if OpenIcon}
      <OpenIcon class="size-4 shrink-0" aria-hidden="true" />
    {/if}
    <span class="truncate">{data.openLabel ?? 'Abrir'}</span>
  </a>
  <a
    href={data.downloadUrl}
    download={data.fileName}
    rel="noopener noreferrer"
    aria-label={`Baixar ${data.fileName}`}
    title={`Baixar ${data.fileName}`}
    class={cn(
      actionButton({ variant: 'ghost', size: 'lg', isIconOnly: true }),
      'inline-flex shrink-0 items-center justify-center',
    )}
  >
    <Download class="size-4" aria-hidden="true" />
  </a>
</div>
