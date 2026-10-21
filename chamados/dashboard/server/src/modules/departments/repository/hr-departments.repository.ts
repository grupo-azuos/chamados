import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';

/**
 * A lista "Departamentos" do sistema de Gestão de RH, lida direto do banco.
 *
 * O RH mora no MESMO Postgres, no schema `gestao_rh` — por isso uma consulta, e não uma ida
 * à API dele: a API do RH só aceita o admin-console, e ler a tabela não pede vínculo, token
 * nem configuração nova. A lista é achada pela `system_key`, e não pelo nome, porque o nome
 * da lista é editável lá e a chave não.
 *
 * Só LEITURA, e só destas duas tabelas. Nada aqui escreve no schema do RH.
 */
@Injectable()
export class HrDepartmentsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listNames(): Promise<string[]> {
    const result = await runQuery(
      this.db.execute<{ name: string }>(sql`
        select item.name
        from gestao_rh.option_items as item
        join gestao_rh.option_lists as list on list.id = item.list_id
        where list.system_key = 'departments'
        order by item.name
      `),
      'ler os departamentos do RH',
    );

    return result.rows.map((row) => row.name.trim()).filter((name) => name !== '');
  }
}
