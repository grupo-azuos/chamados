import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { StorageModule } from '../../lib/storage/storage.module';
import { InventoryItemsController } from './controller/inventory-items.controller';
import { InventoryItemEventsRepository } from './repository/inventory-item-events.repository';
import { InventoryItemsRepository } from './repository/inventory-items.repository';
import { InventoryItemsService } from './service/inventory-items.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 *
 * O `StorageModule` entra porque a foto do produto vive no storage, como o print do chamado.
 * O `AuthModule` dá o provedor de diretório de usuários do admin-console para atribuição de patrimônio.
 */
@Module({
  imports: [StorageModule, AuthModule],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService, InventoryItemsRepository, InventoryItemEventsRepository],
  exports: [InventoryItemsService, InventoryItemsRepository, InventoryItemEventsRepository],
})
export class InventoryItemsModule {}
