import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { runOne, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  inventoryItemEvents,
  type InventoryItemEventInsert,
  type InventoryItemEventRow,
} from '../../../lib/db/schema/inventory-item-events.schema';

@Injectable()
export class InventoryItemEventsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listByItemId(itemId: number): Promise<InventoryItemEventRow[]> {
    return runQuery(
      this.db
        .select()
        .from(inventoryItemEvents)
        .where(eq(inventoryItemEvents.itemId, itemId))
        .orderBy(asc(inventoryItemEvents.createdAt)),
      'listar ocorrências do item de inventário',
    );
  }

  async add(data: InventoryItemEventInsert): Promise<InventoryItemEventRow> {
    return runOne(
      this.db.insert(inventoryItemEvents).values(data).returning(),
      'adicionar ocorrência ao item de inventário',
    );
  }
}
