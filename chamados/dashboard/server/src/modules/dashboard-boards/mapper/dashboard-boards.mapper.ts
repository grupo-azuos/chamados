import {
  type Board,
  type BoardFilter,
  type BoardModule,
  type DashboardScope,
  type LayoutItem,
  type SavedFilter,
  type Widget,
} from '@template/shared/schemas/dashboard-board.schema';

import { toArchive } from '../../../lib/db/archive.util';
import {
  type DashboardBoardRow,
  type SavedFilterRow,
} from '../../../lib/db/schema/dashboard-boards.schema';

/** O painel como a tela o recebe: o salvo, ou o padrão do módulo enquanto ninguém salvou. */
export function toBoard(
  module: BoardModule,
  scope: DashboardScope,
  content: { widgets: Widget[]; layout: LayoutItem[]; filters?: BoardFilter[] | null },
  row: DashboardBoardRow | null,
  canEdit: boolean,
): Board {
  return {
    module,
    scope,
    widgets: content.widgets,
    layout: content.layout,
    filters: content.filters ?? [],
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
    canEdit,
  };
}

export function toSavedFilter(row: SavedFilterRow, canEdit: boolean): SavedFilter {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source: row.source as SavedFilter['source'],
    scope: row.scope,
    tree: row.tree,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    canEdit,
    archive: toArchive(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}
