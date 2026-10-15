import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * A "PASTA" DESTE SISTEMA no Postgres da casa.
 *
 * O banco é o do Supabase do Grupo Azuos, COMPARTILHADO com os outros sistemas (Paralegal,
 * Gestão de RH, admin-console…). Cada um mora num schema próprio, e este é o do chamados:
 * toda tabela daqui nasce com `chamadosSchema.table(...)`, nunca com `pgTable(...)` — que
 * criaria a tabela no `public`, a área comum, onde um nome repetido (`tasks`, `tickets`)
 * colidiria com o de outro sistema.
 */
export const chamadosSchema = pgSchema('chamados');
