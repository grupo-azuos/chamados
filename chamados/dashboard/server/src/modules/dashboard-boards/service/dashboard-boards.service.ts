import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type ArchivedFilter } from '@template/shared/schemas/archive.schema';
import {
  ageBandLabel,
  type Board,
  type BoardModule,
  boardMatchGroup,
  type BoardMatch,
  boardWeight,
  type DashboardScope,
  type DataDimension,
  type DataSourceKey,
  DEFAULT_AGE_BANDS,
  dimensionsOf,
  type FilterGroup,
  hasPersonField,
  isSourceOf,
  isTimeDimension,
  MAX_BOARD_WEIGHT,
  ME_VALUE,
  periodRange,
  type SaveBoardInput,
  type SavedFilter,
  type SaveFilterInput,
  type WidgetData,
  type WidgetQuery,
  windowRange,
} from '@template/shared/schemas/dashboard-board.schema';
import { roleInContext } from '@template/shared/schemas/user.schema';
import { and, sql, type SQL } from 'drizzle-orm';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type SavedFilterRow } from '../../../lib/db/schema/dashboard-boards.schema';
import { toBoard, toSavedFilter } from '../mapper/dashboard-boards.mapper';
import {
  type CountDimension,
  DashboardBoardsRepository,
} from '../repository/dashboard-boards.repository';
import { InvalidFilterError } from '../repository/filter-sql.util';
import { bindViewer, type Viewer } from '../repository/viewer-filter.util';
import {
  ageBandExpression,
  SOURCE_TABLES,
  type SourceTable,
  todayInBrasilia,
} from '../repository/widget-sources';
import { defaultBoard } from './default-boards';

export const MODULE_REQUIRED = 'Você não tem acesso a este módulo.';
export const MANAGER_BOARD_ONLY = 'O painel do Gestor é do gestor e do administrador do módulo.';
export const TEAM_BOARD_EDITORS = 'O painel da Equipe é montado pelo administrador do módulo.';

/**
 * OS PAINÉIS MONTADOS DE CADA MÓDULO — quem vê, quem edita, e os números de cada bloco.
 *
 * - Equipe: todos do módulo veem; o administrador do módulo edita.
 * - Gestor: só o gestor e o administrador do módulo, para ver e para editar.
 * - Pessoal: só a pessoa — cada um tem o seu, em cada módulo.
 *
 * O módulo vem no endereço e é conferido AQUI, contra o acesso da pessoa: a rota é de qualquer
 * módulo (`@AnyModule`), e quem decide é o service. Um bloco só conta fontes do próprio módulo.
 *
 * Filtro salvo: o pessoal só quem criou vê e usa; o compartilhado o módulo vê, e só quem criou
 * (ou o administrador do módulo) muda. Nenhum se apaga — arquiva.
 */
@Injectable()
export class DashboardBoardsService {
  constructor(private readonly repository: DashboardBoardsRepository) {}

  async board(user: RequestUser, module: BoardModule, scope: DashboardScope): Promise<Board> {
    assertCanView(user, module, scope);
    const row = await this.repository.findBoard(module, scope, ownerOf(user, scope));

    return toBoard(module, scope, row ?? defaultBoard(module, scope), row, canEdit(user, module, scope));
  }

  async saveBoard(
    user: RequestUser,
    module: BoardModule,
    scope: DashboardScope,
    input: SaveBoardInput,
  ): Promise<Board> {
    assertCanView(user, module, scope);
    if (!canEdit(user, module, scope)) throw new ForbiddenException(TEAM_BOARD_EDITORS);
    for (const widget of input.widgets) {
      if (!isSourceOf(module, widget.source)) {
        throw new UnprocessableEntityException(`O bloco "${widget.title}" usa uma fonte de outro módulo.`);
      }
      if (widget.filterId) await this.usableFilter(user, module, widget.filterId, widget.source);
    }
    await this.assertWithinWeight(module, scope, ownerOf(user, scope), input);
    const row = await this.repository.saveBoard(module, scope, ownerOf(user, scope), input, user.id);

    return toBoard(module, scope, row, row, true);
  }

  /**
   * A COTA DE PONTOS do painel, conferida aqui e não só na tela. O painel acima da cota continua
   * salvando quem só muda um bloco de lugar: o que se recusa é PASSAR da cota, ou subir ainda mais.
   */
  private async assertWithinWeight(
    module: BoardModule,
    scope: DashboardScope,
    owner: string | null,
    input: SaveBoardInput,
  ): Promise<void> {
    const weight = boardWeight(input.widgets);
    if (weight <= MAX_BOARD_WEIGHT) return;

    const saved = await this.repository.findBoard(module, scope, owner);
    const before = boardWeight(saved?.widgets ?? defaultBoard(module, scope).widgets);
    if (weight <= before) return;

    throw new UnprocessableEntityException(
      `O painel passa da cota de ${MAX_BOARD_WEIGHT} pontos (${weight}). Tire ou troque um bloco.`,
    );
  }

  async data(user: RequestUser, module: BoardModule, query: WidgetQuery): Promise<WidgetData> {
    assertCanView(user, module, 'team');
    if (!isSourceOf(module, query.source)) {
      throw new UnprocessableEntityException('Esta fonte é de outro módulo.');
    }

    return this.translating(async () => {
      const scope = await this.scopeOf(user, module, query);
      const source = SOURCE_TABLES[query.source];
      const dimension = query.groupBy ? dimensionOf(query.source, query.groupBy, query.ageBands) : null;
      const split = query.splitBy ? dimensionOf(query.source, query.splitBy, query.ageBands) : null;
      const counted = await this.repository.countBy(source, {
        tree: scope.tree,
        extra: and(blockConditions(source, query, scope), dimension?.scope, split?.scope),
        dimension,
        split,
      });
      const label = labeler(query.source);

      return {
        total: counted.total,
        grandTotal: counted.grandTotal,
        series: counted.groups.map((group) => ({
          key: group.key,
          label: label(query.groupBy, group.key),
          value: group.value,
        })),
        cells: counted.cells.map((cell) => ({
          row: cell.key,
          rowLabel: label(query.groupBy, cell.key),
          column: cell.key2,
          columnLabel: label(query.splitBy, cell.key2),
          value: cell.value,
        })),
      };
    });
  }

  /**
   * O RECORTE DE UM BLOCO — o filtro salvo (com o "eu" já trocado por quem vê), os filtros de campo
   * do painel, o período e a pessoa.
   */
  private async scopeOf(user: RequestUser, module: BoardModule, query: WidgetQuery): Promise<BlockScope> {
    const saved = query.filterId
      ? (await this.usableFilter(user, module, query.filterId, query.source)).tree
      : null;
    const viewer = { id: user.id, name: user.name };
    const bound = saved ? bindViewer(saved, personFieldsOf(query.source), viewer) : null;
    const tree = withMatches(bound, query.matches);
    const today = todayInBrasilia();
    /* O "Período" do painel, quando escolhido, manda no lugar do período do bloco. */
    const period = query.boardPeriod ? windowRange(query.boardPeriod, today) : periodRange(query.period, today);
    const person = query.person && hasPersonField(query.source) ? personOf(user, query.person) : null;

    return { tree, viewer, period, person };
  }

  /** Um filtro que não dá para traduzir vira 422 com a frase, para a pessoa corrigir. */
  private async translating<TResult>(run: () => Promise<TResult>): Promise<TResult> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof InvalidFilterError) throw new UnprocessableEntityException(error.message);
      throw error;
    }
  }

  async filters(user: RequestUser, module: BoardModule, archived: ArchivedFilter): Promise<SavedFilter[]> {
    assertCanView(user, module, 'team');
    const rows = await this.repository.listFilters(module, user.id, archived);

    return rows.map((row) => toSavedFilter(row, canEditFilter(user, module, row)));
  }

  async createFilter(user: RequestUser, module: BoardModule, input: SaveFilterInput): Promise<SavedFilter> {
    assertCanView(user, module, 'team');
    assertFilterSource(module, input.source);
    const row = await this.repository.insertFilter(module, input, { id: user.id, name: user.name });

    return toSavedFilter(row, true);
  }

  async updateFilter(
    user: RequestUser,
    module: BoardModule,
    id: string,
    input: SaveFilterInput,
  ): Promise<SavedFilter> {
    assertFilterSource(module, input.source);
    await this.editableFilter(user, module, id);
    const row = await this.repository.updateFilter(id, input);
    if (!row) throw filterNotFound();

    return toSavedFilter(row, true);
  }

  /** Arquivar e desarquivar — com a mesma regra de editar. */
  async setFilterArchived(
    user: RequestUser,
    module: BoardModule,
    id: string,
    archived: boolean,
  ): Promise<SavedFilter> {
    await this.editableFilter(user, module, id);
    const row = await this.repository.setFilterArchived(id, archived, user.id);
    if (!row) throw filterNotFound();

    return toSavedFilter(row, true);
  }

  /** O filtro que a pessoa pode usar num bloco: do módulo, visível para ela, em uso e da fonte. */
  private async usableFilter(
    user: RequestUser,
    module: BoardModule,
    id: string,
    source: string,
  ): Promise<SavedFilterRow> {
    const row = await this.repository.findFilter(id);
    if (!row || row.module !== module || !canSeeFilter(user, row)) throw filterNotFound();
    if (row.archivedAt) throw new UnprocessableEntityException(`O filtro "${row.name}" está arquivado.`);
    if (row.source !== source) {
      throw new UnprocessableEntityException(`O filtro "${row.name}" é de outra fonte de dados.`);
    }

    return row;
  }

  private async editableFilter(user: RequestUser, module: BoardModule, id: string): Promise<SavedFilterRow> {
    assertCanView(user, module, 'team');
    const row = await this.repository.findFilter(id);
    if (!row || row.module !== module || !canSeeFilter(user, row)) throw filterNotFound();
    if (!canEditFilter(user, module, row)) {
      throw new ForbiddenException(
        'Este filtro é de outra pessoa: só ela ou o administrador do módulo mudam.',
      );
    }

    return row;
  }
}

/* ------------------------------------------------------------------ quem pode */

function levelIn(user: RequestUser, module: BoardModule) {
  return roleInContext(user, module);
}

function isModuleAdmin(user: RequestUser, module: BoardModule): boolean {
  const level = levelIn(user, module);

  return level === 'admin' || level === 'superadmin';
}

function isModuleManager(user: RequestUser, module: BoardModule): boolean {
  return isModuleAdmin(user, module) || levelIn(user, module) === 'manager';
}

export function canView(user: RequestUser, module: BoardModule, scope: DashboardScope): boolean {
  if (levelIn(user, module) === null) return false;

  return scope !== 'manager' || isModuleManager(user, module);
}

export function canEdit(user: RequestUser, module: BoardModule, scope: DashboardScope): boolean {
  if (!canView(user, module, scope)) return false;
  if (scope === 'personal') return true;
  if (scope === 'manager') return isModuleManager(user, module);

  return isModuleAdmin(user, module);
}

function assertCanView(user: RequestUser, module: BoardModule, scope: DashboardScope): void {
  if (levelIn(user, module) === null) throw new ForbiddenException(MODULE_REQUIRED);
  if (canView(user, module, scope)) return;

  throw new ForbiddenException(MANAGER_BOARD_ONLY);
}

/** Equipe e Gestor são um painel só no módulo (dono nulo); o Pessoal é de cada pessoa. */
function ownerOf(user: RequestUser, scope: DashboardScope): string | null {
  return scope === 'personal' ? user.id : null;
}

function canSeeFilter(user: RequestUser, row: SavedFilterRow): boolean {
  return row.scope === 'shared' || row.ownerId === user.id;
}

function canEditFilter(user: RequestUser, module: BoardModule, row: SavedFilterRow): boolean {
  return row.ownerId === user.id || (row.scope === 'shared' && isModuleAdmin(user, module));
}

function assertFilterSource(module: BoardModule, source: DataSourceKey): void {
  if (isSourceOf(module, source)) return;

  throw new UnprocessableEntityException('Esta fonte é de outro módulo.');
}

function filterNotFound(): NotFoundException {
  return new NotFoundException('Filtro não encontrado.');
}

/* ------------------------------------------------------------------ o recorte */

type DayRange = { from: string; to: string };

/** O recorte de um bloco, já resolvido para quem vê. */
type BlockScope = {
  tree: FilterGroup | null;
  viewer: Viewer;
  period: DayRange | null;
  person: string | null;
};

/** O filtro "Pessoa" do painel: o nome escolhido, ou o de quem vê ("eu"). */
function personOf(user: RequestUser, person: string): string {
  return person === ME_VALUE ? user.name : person;
}

/** As condições do bloco além da árvore: "só os meus", a pessoa, o período e a janela. */
function blockConditions(source: SourceTable, query: WidgetQuery, scope: BlockScope): SQL | undefined {
  return and(
    query.onlyMine ? mineCondition(source, scope.viewer) : undefined,
    scope.person ? personCondition(source, scope.person) : undefined,
    scope.period ? sql`${source.periodDay} between ${scope.period.from} and ${scope.period.to}` : undefined,
    windowCondition(source, query),
  );
}

/**
 * O agrupamento no banco. A faixa de idade não tem expressão fixa: ela depende das faixas do
 * bloco e do dia de hoje, e se ordena pela chave — do mais novo para o mais velho.
 */
export function dimensionOf(
  source: DataSourceKey,
  key: string,
  bands: readonly number[] | null | undefined = null,
): CountDimension {
  const dimension = (dimensionsOf(source) as Record<string, DataDimension>)[key];
  const age = dimension?.kind === 'age' ? SOURCE_TABLES[source].ageDates?.[key] : undefined;
  if (age) {
    const expression = ageBandExpression(age, bands ?? DEFAULT_AGE_BANDS, todayInBrasilia());

    return { key, expression, isTime: false, isOrdered: true, scope: age.only };
  }
  const expression = SOURCE_TABLES[source].dimensions[key];
  if (!dimension || !expression) {
    throw new UnprocessableEntityException(`"${key}" não é um agrupamento desta fonte.`);
  }

  return { key, expression, isTime: isTimeDimension(dimension.kind) };
}

/** O rótulo de cada chave: o da fonte, e o da faixa de idade. */
function labeler(key: DataSourceKey): (dimension: string | null, value: string) => string {
  const source = SOURCE_TABLES[key];
  const ages = new Set(Object.keys(source.ageDates ?? {}));

  return (dimension, value) => {
    const kind = dimension ?? '';
    if (ages.has(kind)) return ageBandLabel(value);

    return source.labelOf?.(kind, value) ?? value;
  };
}

/** "Pessoa", no banco: o campo de pessoa da fonte é a pessoa escolhida, pelo nome. */
export function personCondition(source: SourceTable, person: string): SQL | undefined {
  const column = source.personField ? source.fields[source.personField] : undefined;
  if (!column?.person) return undefined;

  return sql`${column.expression} = ${person}`;
}

/** Os campos de pessoa de uma fonte — onde o "eu" do filtro vale. */
function personFieldsOf(key: DataSourceKey): Set<string> {
  return new Set(
    Object.entries(SOURCE_TABLES[key].fields)
      .filter(([, column]) => column.person)
      .map(([name]) => name),
  );
}

/** "Só os meus": o campo de pessoa da fonte é quem está vendo, pelo nome. */
function mineCondition(source: SourceTable, viewer: Viewer): SQL {
  const column = source.personField ? source.fields[source.personField] : undefined;
  if (!column?.person) {
    throw new UnprocessableEntityException('Esta fonte não tem responsável: "só os meus" não vale aqui.');
  }

  return sql`${column.expression} = ${viewer.name}`;
}

/**
 * A JANELA DA AGENDA, no banco: a data do agrupamento por dia entre as pontas. Janela num
 * agrupamento que não é por dia seria um "tudo" disfarçado, e é recusada.
 */
export function windowCondition(source: SourceTable, query: WidgetQuery): SQL | undefined {
  if (!query.window) return undefined;
  const date = query.groupBy ? source.dayDates?.[query.groupBy] : undefined;
  if (!date) throw new UnprocessableEntityException('A janela da agenda só vale agrupando por dia.');
  const range = windowRange(query.window, todayInBrasilia());

  return sql`${date} between ${range.from} and ${range.to}`;
}

/** A árvore do bloco com os filtros de campo do painel: todos precisam valer (E). */
export function withMatches(tree: FilterGroup | null, matches: readonly BoardMatch[]): FilterGroup | null {
  const group = boardMatchGroup(matches);
  if (!group) return tree;
  if (!tree) return group;

  return { combinator: 'and', rules: [tree, group] };
}
