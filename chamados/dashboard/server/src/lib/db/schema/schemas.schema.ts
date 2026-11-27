import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * UM SCHEMA POR ASSUNTO, no database só deste sistema — o mesmo desenho do `paralegal`, do
 * `shared-api` e do `admin-console`. Quem abre o banco acha a tabela pela tela que a usa, e
 * nunca em `public`: toda tabela daqui nasce com o schema do assunto dela, nunca com `pgTable`.
 *
 * As tabelas moraram juntas no schema `chamados` até a `0045_domain_schemas.sql`, que as moveu
 * (sem copiar dado) e deixou lá views com o nome antigo, para a versão anterior da imagem seguir
 * de pé durante o deploy. O `drizzle-kit` (ver `drizzle.config.ts`) enxerga só os schemas abaixo.
 */

/** Os chamados: abertura, áreas, tipos de problema, anexos, vínculos, ordens de serviço, histórico. */
export const ticketsSchema = pgSchema('tickets');

/** O parque de TI e o estoque: computadores, alertas, transferências, rede, itens e peças. */
export const inventorySchema = pgSchema('inventory');

/** As manutenções dos computadores: as feitas, os orçamentos e a agenda preventiva. */
export const maintenanceSchema = pgSchema('maintenance');

/** Os projetos de software, a ligação com o GitHub, a agenda e a linha do tempo. */
export const softwareSchema = pgSchema('software');

/** As tarefas da equipe de TI: situações, etapas, pessoas e vínculos. */
export const tasksSchema = pgSchema('tasks');

/** O WhatsApp: conexões, modelos, conversas e mensagens. */
export const messagingSchema = pgSchema('messaging');

/** Quem administra o sistema além do Admin Console: superadministradores e papéis internos. */
export const accessSchema = pgSchema('access');

/** O histórico do que se fez no sistema. */
export const auditSchema = pgSchema('audit');

/** Os dashboards montados e os filtros salvos deles. */
export const dashboardSchema = pgSchema('dashboard');

/** Os schemas deste sistema, na ordem do mapa acima. É o filtro do `drizzle-kit`. */
export const APP_SCHEMAS = [
  'tickets',
  'inventory',
  'maintenance',
  'software',
  'tasks',
  'messaging',
  'access',
  'audit',
  'dashboard',
] as const;
