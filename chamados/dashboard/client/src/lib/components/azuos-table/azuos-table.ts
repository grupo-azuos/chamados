/**
 * A porta de entrada da tabela para as telas: a superfície (`Table`) e as peças já com a
 * aparência da casa. Quem mora em `routes/<feature>/components/` não pode importar
 * `lib/components/ui` (é do CLI do shadcn); importa daqui.
 *
 * `TableBody` e `TableCaption` vêm direto do `ui/table`: não têm nada nosso por cima.
 */
export { default as Table } from './azuos-table.svelte';
export { default as TableActions } from './azuos-table-actions.svelte';
export { default as TableCell } from './azuos-table-cell.svelte';
export { default as TableFooter } from './azuos-table-footer.svelte';
export { default as TableHead } from './azuos-table-head.svelte';
export { default as TableHeader } from './azuos-table-header.svelte';
export { default as TableRow } from './azuos-table-row.svelte';
export { TableBody, TableCaption } from '$lib/components/ui/table';
