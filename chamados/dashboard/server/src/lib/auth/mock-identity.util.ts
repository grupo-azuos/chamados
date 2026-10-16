import { isUserMockEnabled, type Env } from '../config/env.schema';
import { MOCK_IDENTITY } from './identity.provider';

type GrantRow = { userId: string | null; userEmail: string | null };

/**
 * Tira da lista os acessos da PESSOA DE DESENVOLVIMENTO quando ela está desligada.
 *
 * O banco é compartilhado: quem programa aponta a máquina para o mesmo Postgres da
 * homologação e roda `superadmin:promote -- dev@chamados.local` para ver o painel. A linha
 * fica lá. Com o mock desligado (produção), ninguém entra como essa pessoa — mas a linha
 * continuaria aparecendo como super-admin e como responsável possível. Aqui ela some.
 */
export function withoutMockIdentity<T extends GrantRow>(
  rows: readonly T[],
  env: Pick<Env, 'USER_MOCK' | 'NODE_ENV'>,
): T[] {
  if (isUserMockEnabled(env)) return [...rows];

  return rows.filter((row) => !isMockIdentityRow(row));
}

function isMockIdentityRow(row: GrantRow): boolean {
  if (row.userId === MOCK_IDENTITY.id) return true;

  return (row.userEmail ?? '').toLowerCase() === MOCK_IDENTITY.email;
}
