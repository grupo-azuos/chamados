import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type DataSourceKey } from '@template/shared/schemas/dashboard-board.schema';
import { type SQL } from 'drizzle-orm';
import { refuseInventoryPhoto } from '@template/shared/domain/inventory-photo.util';
import {
  distinctInventoryNames,
  inventoryNameKey,
} from '@template/shared/domain/inventory-name.util';
import { fitsInInventoryStock, stockAfter } from '@template/shared/domain/inventory-stock.util';
import {
  type CreateInventoryItemEventInput,
  type InventoryItemEvent,
} from '@template/shared/schemas/inventory-item-event.schema';
import {
  type CreateInventoryItemInput,
  type InventoryItem,
  type InventoryItemListQuery,
  type InventoryResponsible,
  type UpdateInventoryItemInput,
} from '@template/shared/schemas/inventory-item.schema';
import {
  type CreateInventoryMovementInput,
  type CreateStockMovementInput,
  type InventoryMovement,
  type InventoryMovementListQuery,
} from '@template/shared/schemas/inventory-movement.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type StagedFile,
  type UploadRequest,
  type UploadTicket,
} from '@template/shared/schemas/staged-file.schema';
import { type TicketStockLink } from '@template/shared/schemas/ticket-stock-item.schema';

import { BOARD_DRILL, type BoardDrillResolver } from '../../dashboard-boards/board-drill.token';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type DatabaseExecutor } from '../../../lib/db/db.type';
import { type InventoryItemRow } from '../../../lib/db/schema/inventory-items.schema';
import { assertCanManageInContext, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { DOWNLOAD_URL_TTL_SECONDS, type FileStorage } from '../../../lib/storage/file-storage.type';
import { buildObjectKey } from '../../../lib/storage/object-key.util';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { STORAGE } from '../../../lib/storage/storage.token';
import {
  toInventoryItem,
  toInventoryItemEvent,
  toInventoryItemInsert,
  toInventoryItemUpdate,
  toInventoryMovement,
  toInventoryMovementInsert,
} from '../mapper/inventory-items.mapper';
import { InventoryItemEventsRepository } from '../repository/inventory-item-events.repository';
import { InventoryItemsRepository } from '../repository/inventory-items.repository';
import { optimizePhoto } from './inventory-photo.util';

/** A fonte do painel que esta lista sabe recortar: a tabela dela, os produtos do inventário. */
const INVENTORY_DRILL_SOURCES: readonly DataSourceKey[] = ['inventoryItems'];

const ITEM_NOT_FOUND = 'Produto não encontrado. Recarregue a lista.';
const ITEM_ARCHIVED =
  'Este produto foi excluído. Desfaça a exclusão em "Removidos" para movimentá-lo de novo.';

/** A pasta do bucket. Nome em inglês: é infraestrutura, o usuário não vê (CONTRIBUTING §1). */
const PHOTO_FOLDER = 'inventory';

/**
 * O ÚNICO caminho de escrita do inventário da Manutenção.
 *
 * Duas regras moram aqui, e as duas são da ÁREA e não do papel geral (#13): quem tem
 * qualquer cargo no sistema CONSULTA o inventário; quem gerencia a Manutenção é que cadastra,
 * altera e exclui. Um gestor de Infraestrutura não mexe na cadeira do escritório, do mesmo
 * jeito que a Manutenção não mexe no parque de máquinas.
 *
 * A foto vai do navegador direto para o storage, por link assinado. Aqui ela é conferida pelo
 * domínio (com o que o storage mediu), encolhida pelo ffmpeg e gravada no lugar definitivo — e a
 * chave dela é o que vai para o banco, nunca o link.
 */
@Injectable()
export class InventoryItemsService {
  constructor(
    private readonly repository: InventoryItemsRepository,
    private readonly eventsRepository: InventoryItemEventsRepository,
    private readonly staging: StagedUploadsService,
    @Inject(STORAGE) private readonly storage: FileStorage,
    @Optional() @Inject(USER_DIRECTORY_PROVIDER) private readonly directory?: UserDirectoryProvider,
    @Optional() @Inject(BOARD_DRILL) private readonly drills?: BoardDrillResolver,
  ) {}

  /**
   * Lista todas as pessoas ativas do escritório (admin-console) para atribuição de responsável.
   * Não exige login no Chamados, pois patrimônio pode ser atribuído a qualquer colaborador.
   */
  async listResponsibles(user: RequestUser): Promise<InventoryResponsible[]> {
    assertCanRead(user.role, 'o inventário da Manutenção');
    if (!this.directory) return [];

    const people = await this.directory.listAllUsers();
    return people
      .filter((person) => !person.banned)
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  /**
   * O link para enviar a foto de um produto. Só quem cadastra no inventário recebe — e a foto
   * que nem é imagem aceita é recusada antes de ser enviada.
   */
  async createPhotoUploadTicket(user: RequestUser, input: UploadRequest): Promise<UploadTicket> {
    assertCanManageInContext(user, 'manutencao', 'enviar fotos de produtos');

    const refusal = refuseInventoryPhoto(input);
    if (refusal) throw new UnprocessableEntityException(refusal.message);

    return this.staging.createUploadTicket(input.fileName);
  }

  async list(user: RequestUser, query: InventoryItemListQuery): Promise<Paginated<InventoryItem>> {
    assertCanRead(user.role, 'o inventário da Manutenção');

    const page = await this.repository.list(query, await this.drillOf(user, query));
    const links = await this.repository.ticketLinksOf(page.rows.map((row) => row.id));
    const items = await Promise.all(page.rows.map((row) => this.toItem(row, links.get(row.id))));

    return { items, total: page.total, page: query.page, pageSize: query.pageSize };
  }

  /** O recorte de um clique no painel em SQL — sem recorte (ou sem o painel), nada. */
  private async drillOf(
    user: RequestUser,
    query: Pick<InventoryItemListQuery, 'drill'>,
  ): Promise<SQL | undefined> {
    if (!query.drill || !this.drills) return undefined;

    return this.drills.drillCondition(user, query.drill, INVENTORY_DRILL_SOURCES);
  }

  async findById(user: RequestUser, id: number): Promise<InventoryItem> {
    assertCanRead(user.role, 'o inventário da Manutenção');

    const links = await this.repository.ticketLinksOf([id]);

    return this.toItem(await this.require(id), links.get(id));
  }

  async create(user: RequestUser, input: CreateInventoryItemInput): Promise<InventoryItem> {
    assertCanManageInContext(user, 'manutencao', 'cadastrar produtos');

    const photoKey = await this.storePhoto(input.photo);
    const named = { ...input, name: await this.spellingOf(input.name) };
    const row = await this.repository.insert(toInventoryItemInsert(named, user.email, photoKey));

    return this.toItem(row);
  }

  /**
   * Alterar o cadastro.
   *
   * A foto antiga só é apagada do bucket DEPOIS que o banco aceitou a troca: na ordem
   * inversa, uma falha na gravação deixaria o produto apontando para um arquivo que não
   * existe mais, e a tela mostraria imagem quebrada.
   */
  async update(
    user: RequestUser,
    id: number,
    input: UpdateInventoryItemInput,
  ): Promise<InventoryItem> {
    assertCanManageInContext(user, 'manutencao', 'alterar produtos');

    const current = await this.require(id);
    const photoKey = input.photo ? await this.storePhoto(input.photo) : undefined;

    const named =
      input.name === undefined ? input : { ...input, name: await this.spellingOf(input.name) };
    const row = await this.repository.update(
      id,
      toInventoryItemUpdate(named, user.email, photoKey),
    );
    if (!row) throw new NotFoundException(ITEM_NOT_FOUND);

    await this.discardReplacedPhoto(current.photoKey, row.photoKey);

    return this.toItem(row);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanManageInContext(user, 'manutencao', 'excluir produtos');

    await this.require(id);

    /* Excluir ARQUIVA: o produto sai do inventário, e a foto e o extrato ficam guardados para
       o "Desfazer" devolvê-lo como estava. */
    await this.repository.setArchived(id, true, user.id);
  }

  /** Desfaz a exclusão. Quem pode excluir é quem pode desfazer. */
  async restore(user: RequestUser, id: number): Promise<InventoryItem> {
    assertCanManageInContext(user, 'manutencao', 'excluir produtos');

    await this.require(id);
    await this.repository.setArchived(id, false, null);

    return this.toItem(await this.require(id));
  }

  /** O extrato do depósito: do movimento mais novo para o mais velho. */
  async movements(
    user: RequestUser,
    query: InventoryMovementListQuery,
  ): Promise<Paginated<InventoryMovement>> {
    assertCanRead(user.role, 'o depósito da Manutenção');

    const page = await this.repository.listMovements(query);

    return {
      items: page.rows.map(toInventoryMovement),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Registra uma entrada, uma saída ou um descarte e move o saldo junto.
   *
   * Tudo DENTRO de uma transação, com o produto travado: a linha do extrato e o saldo entram
   * juntos ou não entram, e duas pessoas movimentando o mesmo produto ao mesmo tempo não
   * conseguem ler o mesmo saldo antigo.
   *
   * O que sai é conferido contra o que existe. Aceitar calado e prender o saldo em zero faria
   * o número mentir a partir dali — e a diferença só apareceria na prateleira.
   */
  async createMovement(
    user: RequestUser,
    itemId: number,
    input: CreateInventoryMovementInput,
  ): Promise<InventoryMovement> {
    assertCanManageInContext(user, 'manutencao', 'movimentar o depósito');

    const quantity = Number(input.quantity);

    return this.repository.transaction(async (executor) => {
      const item = await this.repository.findByIdForUpdate(itemId, executor);
      if (!item) throw new NotFoundException(ITEM_NOT_FOUND);
      if (item.archivedAt) throw new UnprocessableEntityException(ITEM_ARCHIVED);

      if (!fitsInInventoryStock(item.balance, input.type, quantity)) {
        throw new UnprocessableEntityException(stockMessage(item, quantity));
      }

      const balance = stockAfter(item.balance, input.type, quantity);

      const movement = await this.repository.insertMovement(
        toInventoryMovementInsert(itemId, input, balance, user.email),
        executor,
      );
      await this.repository.updateBalance(itemId, balance, executor);

      return toInventoryMovement({ movement, item });
    });
  }

  /**
   * Entrada, saída ou descarte pelo NOME do produto — o Depósito conta "Cadeira", não cada cadeira
   * cadastrada. Numa transação, com os produtos do nome travados: a entrada vai para o que já tem
   * mais saldo; a saída e o descarte tiram de um em um, do que tem mais para o que tem menos, cada
   * parte com a sua linha no extrato. Devolve a primeira linha.
   */
  async createStockMovement(
    user: RequestUser,
    input: CreateStockMovementInput,
  ): Promise<InventoryMovement> {
    assertCanManageInContext(user, 'manutencao', 'movimentar o depósito');

    const quantity = Number(input.quantity);

    return this.repository.transaction(async (executor) => {
      const items = await this.repository.findByNameForUpdate(input.name, executor);
      if (!items.length) throw new NotFoundException(ITEM_NOT_FOUND);

      const total = items.reduce((sum, item) => sum + item.balance, 0);
      if (!fitsInInventoryStock(total, input.type, quantity)) {
        throw new UnprocessableEntityException(
          stockMessage({ ...items[0]!, balance: total }, quantity),
        );
      }

      const parts =
        input.type === 'in' ? [{ item: items[0]!, quantity }] : takeFrom(items, quantity);
      const movements = [];
      for (const part of parts) {
        movements.push(
          await this.moveOne(
            part.item,
            { ...input, quantity: part.quantity },
            user.email,
            executor,
          ),
        );
      }

      return movements[0]!;
    });
  }

  /** Uma linha do extrato e o saldo novo de UM produto, dentro da transação de quem chamou. */
  private async moveOne(
    item: InventoryItemRow,
    input: CreateInventoryMovementInput,
    actorEmail: string,
    executor: DatabaseExecutor,
  ): Promise<InventoryMovement> {
    const balance = stockAfter(item.balance, input.type, Number(input.quantity));
    const movement = await this.repository.insertMovement(
      toInventoryMovementInsert(item.id, input, balance, actorEmail),
      executor,
    );
    await this.repository.updateBalance(item.id, balance, executor);

    return toInventoryMovement({ movement, item });
  }

  /** Os nomes de produto, um por grafia (a mais usada) — a lista do campo "Nome do produto". */
  async names(user: RequestUser): Promise<string[]> {
    assertCanRead(user.role, 'o inventário da Manutenção');

    return distinctInventoryNames(await this.repository.names());
  }

  /**
   * A grafia que o nome já tem no inventário: quem escreve "CADEIRA" com "Cadeira" cadastrada
   * grava "Cadeira" — o Depósito agrupa pelo nome e duas grafias virariam dois produtos.
   */
  private async spellingOf(name: string): Promise<string> {
    const typed = name.trim();
    const key = inventoryNameKey(typed);
    const known = distinctInventoryNames(await this.repository.names());

    return known.find((spelling) => inventoryNameKey(spelling) === key) ?? typed;
  }

  /** A linha do tempo de ocorrências do produto: do mais antigo para o mais novo. */
  async events(user: RequestUser, itemId: number): Promise<InventoryItemEvent[]> {
    assertCanRead(user.role, 'as ocorrências do produto');
    await this.require(itemId);

    const rows = await this.eventsRepository.listByItemId(itemId);

    return rows.map(toInventoryItemEvent);
  }

  /** Registra uma nova ocorrência (defeito, troca, manutenção, observação) na linha do tempo. */
  async addEvent(
    user: RequestUser,
    itemId: number,
    input: CreateInventoryItemEventInput,
  ): Promise<InventoryItemEvent> {
    assertCanManageInContext(user, 'manutencao', 'registrar ocorrências');
    await this.require(itemId);

    const authorName = user.name?.trim() || user.email;
    const row = await this.eventsRepository.add({
      itemId,
      type: input.type,
      description: input.description.trim(),
      authorName,
      createdBy: user.email,
    });

    return toInventoryItemEvent(row);
  }

  /** O produto, ou 404 com uma frase que diz o que fazer. */
  private async require(id: number): Promise<InventoryItemRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(ITEM_NOT_FOUND);

    return row;
  }

  /** A linha do banco com o link temporário da foto, do jeito que a tela precisa. */
  private async toItem(
    row: InventoryItemRow,
    ticketLinks?: TicketStockLink[],
  ): Promise<InventoryItem> {
    return toInventoryItem(row, await this.photoUrl(row.photoKey), ticketLinks);
  }

  /**
   * O link assinado da foto. Falha de storage NÃO derruba a lista: o produto aparece sem
   * imagem, que é bem melhor do que a tela inteira recusar carregar por causa de uma foto.
   */
  private async photoUrl(key: string | null): Promise<string | null> {
    if (!key) return null;

    try {
      return await this.storage.downloadUrl(key, DOWNLOAD_URL_TTL_SECONDS, null);
    } catch {
      return null;
    }
  }

  /**
   * Tira a foto da área temporária e devolve a chave definitiva.
   *
   * Confere o arquivo que o storage MEDIU — a foto que não serve sai da área temporária, com o
   * motivo. A imagem é encolhida antes de ir para o lugar definitivo (ver
   * `inventory-photo.util`): o servidor a lê do storage, sem ela passar pela requisição. Se o
   * ffmpeg não der conta, vai o original: perder o cadastro por causa de uma conversão seria
   * trocar um problema pequeno (arquivo maior) por um grande (produto não cadastrado).
   */
  private async storePhoto(photo?: StagedFile): Promise<string | null> {
    if (!photo) return null;

    const measured = await this.staging.inspect(photo);
    const refusal = refuseInventoryPhoto(measured);
    if (refusal) {
      await this.staging.discard([photo.storageKey]);
      throw new UnprocessableEntityException(refusal.message);
    }

    const original = await this.storage.get(photo.storageKey);
    const optimized = original ? await optimizePhoto(original.content) : null;
    if (!optimized) return this.staging.promote(photo, PHOTO_FOLDER);

    const key = buildObjectKey(PHOTO_FOLDER, 'foto.webp');
    await this.storage.put(key, optimized.content, optimized.contentType);
    await this.staging.discard([photo.storageKey]);

    return key;
  }

  /**
   * Apaga do bucket a foto que deixou de ser usada.
   *
   * Falha aqui não derruba a operação: o cadastro já está certo no banco, e um arquivo órfão
   * no bucket custa centavos — devolver erro para quem só queria trocar a foto custaria a
   * confiança na tela.
   */
  private async discardReplacedPhoto(
    previousKey: string | null,
    currentKey: string | null,
  ): Promise<void> {
    if (!previousKey) return;
    if (previousKey === currentKey) return;

    try {
      await this.storage.remove([previousKey]);
    } catch {
      // segue adiante: o banco já tem a verdade.
    }
  }
}

/**
 * A recusa diz o número, não só "não dá".
 *
 * Quem lê precisa saber se faltou uma ou faltaram dez para decidir o que fazer: registrar a
 * entrada que alguém esqueceu, ou conferir a prateleira.
 */
/** Quanto sai de cada produto do nome, do que tem mais saldo para o que tem menos. */
function takeFrom(
  items: InventoryItemRow[],
  quantity: number,
): { item: InventoryItemRow; quantity: number }[] {
  const parts: { item: InventoryItemRow; quantity: number }[] = [];
  let missing = quantity;
  for (const item of items) {
    const taken = Math.min(item.balance, missing);
    if (taken > 0) parts.push({ item, quantity: taken });
    missing -= taken;
  }

  return parts;
}

function stockMessage(item: InventoryItemRow, quantity: number): string {
  if (item.balance === 0) {
    return `Não há ${item.name} no depósito. Registre uma entrada antes.`;
  }

  return `Só há ${item.balance} de ${item.name} no depósito, e o movimento é de ${quantity}. Confira a prateleira e registre a entrada que faltou.`;
}
