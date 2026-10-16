import { type INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { type SessionUser } from '@template/shared/schemas/user.schema';
import { sql } from 'drizzle-orm';

import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/app.setup';
import { IdentityProvider, type ForwardedIdentity } from '../../src/lib/auth/identity.provider';
import { parseEnv } from '../../src/lib/config/env.schema';
import { DB } from '../../src/lib/db/db.token';
import { type Database } from '../../src/lib/db/db.type';
import { MemoryStorage } from '../../src/lib/storage/memory-storage';
import { STORAGE } from '../../src/lib/storage/storage.token';

/**
 * O PREPARO comum dos testes de ponta a ponta da API — o que todo arquivo de E2E precisa
 * fazer igual, num lugar só.
 *
 * Vive aqui por um motivo concreto: o adaptador de WebSocket. A API tem um gateway (o canal
 * dos agentes), e o Nest MATA o processo ao subir um gateway sem adaptador. Cada arquivo que
 * lembrasse disso por conta própria seria um arquivo que um dia esquece — e o sintoma é a
 * suíte inteira morrendo sem dizer por quê.
 *
 * O que é FINGIDO aqui são só os dois serviços de fora, e pelo mesmo motivo em ambos os casos
 * (depender deles faria o teste precisar de conta de verdade, de internet e de dinheiro):
 *
 *  - **O admin-console**, que identifica a pessoa. Os cabeçalhos `x-forwarded-user-*` são
 *    mandados de verdade e lidos pelo middleware de verdade; o que é fingido é só a leitura
 *    dos módulos no banco — combinar papel e módulo é assunto de `identity.provider.test.ts`.
 *  - **O storage S3**, onde ficam os arquivos. Vira o `MemoryStorage`: o mesmo contrato, sem
 *    rede. O teste faz o papel do navegador — pede o link à API e põe o arquivo na área
 *    temporária —, e a API confere, move e apaga de verdade.
 *
 * Tudo o mais é real: a migration sobe, a policy decide, a restrição do banco recusa e o
 * filtro de erro traduz. É o que teste com repository fingido não prova.
 */

/**
 * As pessoas dos testes, já com o que a identidade resolveria: Ana e Caio são Administradores
 * de Infraestrutura (mexem em tudo lá); Bia é Gestora de Infraestrutura (só consulta).
 */
export const ANA: SessionUser = {
  id: '00000000-0000-4000-8000-00000000000a',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'admin',
  roles: { infra: 'admin' },
};
export const BIA: SessionUser = {
  id: '00000000-0000-4000-8000-00000000000b',
  email: 'bia@empresa.com.br',
  name: 'Bia',
  role: 'manager',
  roles: { infra: 'user' },
};
export const CAIO: SessionUser = {
  id: '00000000-0000-4000-8000-00000000000c',
  email: 'caio@empresa.com.br',
  name: 'Caio',
  role: 'admin',
  roles: { infra: 'admin' },
};

const PEOPLE: SessionUser[] = [ANA, BIA, CAIO];

/** Os quatro cabeçalhos que o admin-console injeta pelo proxy, para uma pessoa. */
export function forwardedAs(person: Pick<SessionUser, 'id' | 'email' | 'name'>, role = 'admin') {
  return {
    'x-forwarded-user-id': person.id,
    'x-forwarded-user-email': person.email,
    'x-forwarded-user-name': person.name,
    'x-forwarded-user-role': role,
  };
}

export const asAna = () => forwardedAs(ANA, 'admin');
export const asBia = () => forwardedAs(BIA, 'manager');
export const asCaio = () => forwardedAs(CAIO, 'admin');

/** Alguém que o proxy identificou, mas que este sistema não conhece. */
export const asStranger = () =>
  forwardedAs({ id: '00000000-0000-4000-8000-0000000000ff', email: 'x@fora.com', name: 'X' });

class FakeIdentityProvider {
  resolve(forwarded: ForwardedIdentity): Promise<SessionUser | null> {
    return Promise.resolve(PEOPLE.find((person) => person.id === forwarded.id) ?? null);
  }
}

export type E2eApp = {
  app: INestApplication;
  /** O storage em memória: o teste põe nele o que o navegador enviaria, e confere o que sobrou
      — a regra é "sai do banco E do bucket", e sem isso metade dela ficaria sem prova. */
  storage: MemoryStorage;
  /** A conexão de verdade — para arquivos que precisam preparar dado que a API não expõe
      (ex.: cargo por área, #13), sem reinventar a conexão. */
  db: Database;
  /** Esvazia as tabelas que ESTE arquivo usa, para nenhum teste herdar o dado de outro. */
  truncate: (...tables: string[]) => Promise<void>;
};

/**
 * Sobe a API inteira contra a `TEST_DATABASE_URL`.
 *
 * `RESTART IDENTITY` no `truncate` zera o contador de `id` junto: sem isso os ids cresceriam a
 * cada execução, e qualquer asserção sobre protocolo (que é derivado do id) só passaria na
 * primeira vez.
 */
export async function createE2eApp(testDatabaseUrl: string): Promise<E2eApp> {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.API_LOG_LEVEL = 'error';
  /* Sem a pessoa de desenvolvimento: requisição sem cabeçalho tem de levar 401, como em produção. */
  process.env.USER_MOCK = 'false';

  const storage = new MemoryStorage();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IdentityProvider)
    .useClass(FakeIdentityProvider)
    .overrideProvider(STORAGE)
    .useValue(storage)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error'] });
  setupApp(app, parseEnv(process.env));
  /* Sem isto o Nest tenta carregar o Socket.IO para o gateway dos agentes, não acha, e mata o
     processo — a suíte morre antes do primeiro teste. */
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.init();

  const db = app.get<Database>(DB);

  const truncate = async (...tables: string[]): Promise<void> => {
    if (tables.length === 0) return;

    await db.execute(sql.raw(`truncate table ${tables.join(', ')} restart identity cascade`));
  };

  return { app, storage, db, truncate };
}
