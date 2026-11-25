import { boardWeight, MAX_BOARD_WEIGHT, saveBoardSchema } from '@template/shared/schemas/dashboard-board.schema';
import { sql } from 'drizzle-orm';

import { type DatabaseExecutor } from '../../../server/src/lib/db/db.type';
import { dashboardBoards, savedFilters } from '../../../server/src/lib/db/schema/dashboard-boards.schema';
import { openSeedDatabase, report } from '../seed.util';
import { BOARDS_SEED, SAVED_FILTERS_SEED } from './dashboard-boards.data';

/* Quem aparece como autor dos filtros salvos e dos painéis prontos. */
const SEED_AUTHOR = 'Painéis prontos';
const SEED_OWNER = 'seed:dashboard-boards';

/**
 * Grava os painéis prontos (Equipe e Gestor de cada módulo) e os filtros salvos que eles usam.
 * Cada painel passa pelo MESMO contrato do "Guardar" e pela cota de pontos antes de gravar: um
 * painel que a tela recusaria não entra pelo seed. Grava por cima do que existe no lugar.
 */
export async function seedDashboardBoards(db: DatabaseExecutor): Promise<number> {
  for (const seed of BOARDS_SEED) {
    saveBoardSchema.parse(seed);
    const weight = boardWeight(seed.widgets);
    if (weight > MAX_BOARD_WEIGHT) throw new Error(`Board ${seed.module}/${seed.scope} weighs ${weight}`);
  }

  for (const seed of SAVED_FILTERS_SEED) {
    const row = { ...seed, scope: 'shared' as const, ownerId: SEED_OWNER, ownerName: SEED_AUTHOR };
    await db
      .insert(savedFilters)
      .values(row)
      .onConflictDoUpdate({ target: savedFilters.id, set: { ...row, updatedAt: new Date(), archivedAt: null } });
  }

  for (const seed of BOARDS_SEED) {
    const content = { widgets: seed.widgets, layout: seed.layout, filters: seed.filters, updatedAt: new Date(), updatedBy: SEED_AUTHOR };
    await db
      .insert(dashboardBoards)
      .values({ module: seed.module, scope: seed.scope, ownerId: null, ...content })
      .onConflictDoUpdate({ target: [dashboardBoards.module, dashboardBoards.scope, dashboardBoards.ownerId], set: content });
  }
  /* Com o schema escrito: a conexão de migrations não procura no `chamados` sozinha. */
  await db.execute(
    sql`select setval(pg_get_serial_sequence('chamados.dashboard_boards', 'id'), coalesce((select max(id) from chamados.dashboard_boards), 0) + 1, false)`,
  );

  return BOARDS_SEED.length;
}

if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('painéis prontos', await seedDashboardBoards(db));
    } finally {
      await close();
    }
  });
}
