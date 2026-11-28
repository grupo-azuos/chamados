<script lang="ts">
  /**
   * As peças da tabela entram por `children` e o rodapé por snippet — e snippet só se escreve
   * dentro de um componente. Este casulo monta uma tabela pequena para o teste olhar.
   */
  import {
    Table,
    TableActions,
    TableActionsCell,
    TableActionsHead,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableText,
  } from './azuos-table';

  let {
    hasFooter = false,
    containerClass,
    cellClass,
    onRowClick,
  }: {
    hasFooter?: boolean;
    containerClass?: string;
    cellClass?: string;
    onRowClick?: () => void;
  } = $props();
</script>

{#snippet content()}
  <TableHeader>
    <TableRow>
      <TableHead>Peça</TableHead>
      <TableHead><span class="sr-only">Ações</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell class={cellClass}>Memória 8 GB</TableCell>
      <TableCell>
        <TableActions><button type="button">Ver histórico</button></TableActions>
      </TableCell>
    </TableRow>
    <TableRow onclick={onRowClick}>
      <TableCell><TableText data={{ text: 'Placa-mãe com nome comprido' }} ui={{ className: 'max-w-72' }} /></TableCell>
      <TableActionsCell><button type="button">Mais ações</button></TableActionsCell>
    </TableRow>
    <TableRow>
      <TableCell><TableText data={{ text: '  ' }} /></TableCell>
      <TableActionsHead />
    </TableRow>
  </TableBody>
{/snippet}

{#if hasFooter}
  <Table {containerClass}>
    {@render content()}
    {#snippet footer()}
      <span>Estoque de peças</span>
      <span>1 peça</span>
    {/snippet}
  </Table>
{:else}
  <Table {containerClass}>{@render content()}</Table>
{/if}
