import { type DepartmentOption } from '@template/shared/domain/department.util';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { sql, type SQL } from 'drizzle-orm';

import { qualified } from './sql-column.util';
import { computers } from './schema/computers.schema';

/**
 * OS NOMES DO QUE MORA FORA DO BANCO — a pessoa do diretório (admin-console) e o departamento do
 * RH —, para as consultas que precisam do NOME em SQL.
 *
 * O computador guarda só os IDs (`responsible_id`, `department_id`). A tela principal resolve o
 * nome no service, com a lista na mão; mas o painel, a Inteligência, o orçamento e a manutenção
 * agrupam e filtram pelo nome no próprio banco, e o banco não conhece o admin-console nem o RH.
 *
 * Por isso a última lista LIDA com sucesso fica aqui, na memória do processo, e vira uma tabela
 * de valores dentro da consulta (`(values (12, 'Fiscal'), …)`). Quem atualiza é quem lê: o
 * `DepartmentsService` a cada leitura do RH e o diretório a cada leitura do escritório inteiro.
 * Falha não apaga a lista: vale a última boa. O sistema lê as duas ao subir.
 *
 * Um id que não está na lista (a pessoa saiu do diretório, o departamento saiu do RH) vira nulo
 * — e o agrupamento o mostra como "(Sem responsável)" / "(Sem departamento)", nunca o id cru.
 */
let departmentNames = new Map<number, string>();
let people = new Map<string, { name: string; avatarUrl: string | null }>();

export function rememberDepartments(options: readonly DepartmentOption[]): void {
  departmentNames = new Map(options.map((option) => [option.id, option.name]));
}

export function rememberPeople(users: readonly DirectoryUser[]): void {
  people = new Map(
    users.map((user) => [user.id, { name: user.name, avatarUrl: user.image ?? null }]),
  );
}

export function departmentNameOf(id: number | null | undefined): string | null {
  return id === null || id === undefined ? null : (departmentNames.get(id) ?? null);
}

export function personOf(
  id: string | null | undefined,
): { name: string; avatarUrl: string | null } | null {
  return id ? (people.get(id) ?? null) : null;
}

/** Só para teste: começa sem nenhuma lista. */
export function forgetReferenceNames(): void {
  departmentNames = new Map();
  people = new Map();
}

/** O nome do departamento OFICIAL da máquina, em SQL — nulo sem departamento ou sem par. */
export function computerDepartmentNameSql(): SQL<string | null> {
  const entries = [...departmentNames.entries()];
  if (entries.length === 0) return sql<string | null>`null::text`;

  const values = sql.join(
    entries.map(([id, name]) => sql`(${id}::int, ${name}::text)`),
    sql`, `,
  );

  return sql<
    string | null
  >`(select "ref"."name" from (values ${values}) as "ref"("id", "name") where "ref"."id" = ${qualified(computers.departmentId)})`;
}

/** O nome do responsável da máquina, em SQL — nulo sem responsável ou com id sem par. */
export function computerResponsibleNameSql(): SQL<string | null> {
  const entries = [...people.entries()];
  if (entries.length === 0) return sql<string | null>`null::text`;

  const values = sql.join(
    entries.map(([id, person]) => sql`(${id}::text, ${person.name}::text)`),
    sql`, `,
  );

  return sql<
    string | null
  >`(select "ref"."name" from (values ${values}) as "ref"("id", "name") where "ref"."id" = ${qualified(computers.responsibleId)})`;
}
