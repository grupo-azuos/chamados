import { legacyCodesOf } from '@template/shared/domain/department.util';
import { inArray, sql, type Column, type SQL } from 'drizzle-orm';

import { qualified } from './sql-column.util';

/* As letras acentuadas e as sem acento, na mesma ordem — para o `translate` do Postgres. */
const ACCENTED = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ';
const PLAIN = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC';

/**
 * "Esta coluna é o departamento pedido": o mesmo nome IGNORANDO acento, maiúscula e espaço
 * nas pontas, ou o CÓDIGO ANTIGO equivalente (`legacyCodesOf`).
 *
 * O nome vem do RH ("Departamento Pessoal"); o dado gravado pode ser "DEPARTAMENTO PESSOAL",
 * "departamento pessoal " ou o código `pessoal` — há registros assim no banco mesmo depois da
 * migration 0011. Comparar exato fazia o filtro de departamento voltar vazio.
 */
export function departmentMatches(column: Column, department: string): SQL {
  const normalize = (value: SQL) => sql`lower(translate(trim(${value}), ${ACCENTED}, ${PLAIN}))`;
  const byName = sql`${normalize(qualified(column))} = ${normalize(sql`${department}`)}`;
  const codes = legacyCodesOf(department);
  if (codes.length === 0) return byName;

  return sql`(${byName} or ${inArray(column, codes)})`;
}
