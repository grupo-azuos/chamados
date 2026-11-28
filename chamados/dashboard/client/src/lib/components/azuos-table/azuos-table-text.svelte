<!--
  @component
  O TEXTO DE UMA CÉLULA da `AzuosTable`: numa linha só, cortado com "…" quando não cabe, e o texto
  inteiro no balão do projeto — só quando cortou (`AzuosTruncatedText`). Sem texto, o traço de
  sempre, para a coluna não ficar com um buraco.

  Existe porque cada tabela resolvia isso à mão, e o `truncate` dentro de um `flex` sem `min-w-0`
  não corta nada: o nome comprido passava por cima da coluna do lado.

  - `data.text`: o texto; `data.empty`: o que aparece sem ele (o traço, por padrão).
  - `ui.className`: a LARGURA MÁXIMA da coluna (`max-w-72` no nome, `max-w-36` no resto). É ela
    que segura a coluna: sem teto, o texto comprido alarga a tabela em vez de ser cortado.
-->
<script lang="ts" module>
  export type AzuosTableTextProps = {
    data: { text: string | null | undefined; empty?: string };
    ui?: { className?: string };
  };
</script>

<script lang="ts">
  import TruncatedText from '$lib/components/azuos-truncated-text/azuos-truncated-text.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui }: AzuosTableTextProps = $props();

  const text = $derived(data.text?.trim() ? data.text : null);
</script>

{#if text}
  <span data-slot="table-text" class="contents">
    <TruncatedText data={{ text }} ui={{ className: cn('min-w-0 truncate', ui?.className) }} />
  </span>
{:else}
  <span class={cn('block truncate', ui?.className)}>{data.empty ?? '-'}</span>
{/if}
