import { z } from 'zod';

/**
 * Contrato do ambiente. O processo não sobe com variável errada — falhar na partida é
 * barato; descobrir em produção que a porta estava errada custa um dia.
 *
 * Quase todo valor tem padrão, de propósito: o template precisa subir com `npm run dev` numa
 * máquina recém-clonada. As exceções são os segredos — endereço do banco e credenciais do
 * storage S3 —, que entram SEM `.default()`: não existe padrão razoável para um segredo, e o
 * processo recusando subir e dizendo o nome da variável é melhor do que ele subir e falhar
 * na primeira gravação.
 */
export const envSchema = z.object({
  GITHUB_APP_ID: z.string().regex(/^\d+$/).optional(),
  GITHUB_APP_INSTALLATION_ID: z.string().regex(/^\d+$/).optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1).optional(),
  GITHUB_OAUTH_CLIENT_ID: z.string().trim().min(1).optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().trim().min(1).optional(),
  GITHUB_OAUTH_REDIRECT_URI: z.string().url().optional(),
  GITHUB_OAUTH_FRONTEND_URL: z.string().url().optional(),
  GITHUB_OAUTH_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  /**
   * O bot de WhatsApp (`chamados/dashboard/bot`), um programa à parte que o servidor chama por
   * HTTP. As duas são opcionais: sem elas o sistema funciona inteiro, só sem o vínculo de
   * WhatsApp — a tela avisa que a integração não foi configurada.
   *
   * O token é o MESMO `BOT_API_TOKEN` do bot. Quem o tem manda mensagem pelo WhatsApp de
   * qualquer pessoa vinculada: é segredo de servidor, nunca de tela.
   */
  BOT_API_URL: z.string().url().optional(),
  BOT_API_TOKEN: z.string().min(32).optional(),
  /**
   * Quantas mensagens automáticas podem sair por dia pelo número de UMA pessoa. Passou disso, o
   * sistema para de enviar por ela até o dia seguinte — é a contenção contra o WhatsApp
   * bloquear o número. O aviso sai em 70% do teto. Não existe número "seguro" publicado pelo
   * WhatsApp: o padrão é uma estimativa conservadora.
   */
  WHATSAPP_DAILY_LIMIT: z.coerce.number().int().min(1).max(1000).default(100),
  /**
   * O endereço PÚBLICO da tela, usado nos links que vão nas mensagens ("acompanhe por aqui").
   * Sem ele, vale a primeira origem de `API_CORS_ORIGIN`.
   */
  APP_PUBLIC_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(3005),
  API_CORS_ORIGIN: z.string().min(1).default('http://localhost:5005'),
  API_LOG_LEVEL: z.enum(['debug', 'log', 'warn', 'error']).default('log'),

  /**
   * A TRAVA DE REQUISIÇÃO: quantas chamadas um mesmo IP pode fazer dentro da janela.
   *
   * O padrão é folgado de propósito — a tela faz várias chamadas por clique (lista, resumo,
   * contadores), e um limite apertado transformaria uso normal em erro. Quem estiver sob
   * ataque aperta pela variável, sem mexer no código.
   */
  API_RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  API_RATE_LIMIT: z.coerce.number().int().min(1).max(100_000).default(300),

  /**
   * O limite do webhook do UniFi, bem mais apertado que o resto.
   *
   * A porta é pública (o controlador da rede não tem login) e o corpo é guardado como veio:
   * é o endereço mais interessante da API para quem quiser enchê-la de lixo. Um controlador
   * de verdade manda um alerta por queda, não trezentos por minuto.
   */
  API_WEBHOOK_RATE_LIMIT: z.coerce.number().int().min(1).max(10_000).default(12),

  /**
   * Quantos proxies existem entre a internet e este processo.
   *
   * Isto decide QUEM a trava de requisição conta. Atrás do Traefik (Coolify), todo mundo
   * chega pelo mesmo endereço de rede: sem este valor em `1`, o mundo inteiro dividiria um
   * único balde e uma pessoa ocupada deixaria os outros de fora. Em desenvolvimento é `0`,
   * porque o navegador fala direto com a API.
   *
   * Não é para aumentar "por segurança": cada salto a mais é um salto em que o endereço
   * passa a ser o que o cliente DISSE ser, e aí a trava deixa de valer.
   */
  API_TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),

  /**
   * A string de conexão do Postgres (o do Supabase da casa), no formato
   * `postgresql://usuario:senha@host:5432/postgres`.
   *
   * O banco é COMPARTILHADO com os outros sistemas do Grupo Azuos: as tabelas deste moram no
   * schema `chamados`, e as migrations têm a lista própria (`drizzle.__chamados_migrations`).
   * É segredo: mora no `.env`, que não é versionado.
   */
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, 'Informe a string de conexão do Postgres (DATABASE_URL)')
    .startsWith('postgres', 'A DATABASE_URL precisa começar com postgres:// ou postgresql://'),

  /**
   * O banco que os testes E2E usam. Eles APAGAM e recriam as tabelas, então nunca pode ser o
   * mesmo da DATABASE_URL — use um Postgres descartável só para teste.
   *
   * Sem ele os testes E2E não rodam; o resto do sistema sobe normalmente.
   */
  TEST_DATABASE_URL: z.string().trim().optional(),

  /**
   * O armazenamento de arquivos, pelo PROTOCOLO S3 — o mesmo arranjo da Gestão de RH. Trocar de
   * provedor (Supabase Storage, AWS, MinIO, R2) é trocar estes valores: o código só conhece o
   * protocolo.
   *
   * `S3_ENDPOINT` vazio usa a AWS; no Supabase é `http(s)://<host>/storage/v1/s3`. Chave e
   * segredo não têm padrão: sem eles o processo não sobe, dizendo o nome.
   */
  S3_ENDPOINT: z
    .string()
    .trim()
    .url('S3_ENDPOINT precisa ser uma URL completa')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  S3_REGION: z.string().trim().min(1).default('local'),
  S3_BUCKET: z.string().trim().min(1).default('chamados'),
  S3_ACCESS_KEY_ID: z.string().trim().min(1, 'Informe a chave de acesso do storage S3'),
  S3_SECRET_ACCESS_KEY: z.string().trim().min(1, 'Informe o segredo do storage S3'),
  /* MinIO e Supabase endereçam o bucket no caminho (`/bucket/chave`), não no subdomínio. */
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  /**
   * Por quantos segundos um link de download assinado continua valendo.
   *
   * Curto de propósito: o link dá acesso ao arquivo a quem o tiver, sem passar pela
   * identidade. Ele existe para o navegador baixar AGORA, não para ser guardado. O endereço do
   * link é o do `S3_ENDPOINT`: ele precisa ser alcançável pelo navegador de quem baixa.
   */
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),

  /**
   * O segredo do webhook do UniFi.
   *
   * O controlador da rede não tem login: ele prova quem é apresentando este valor na URL do
   * webhook. Sem a variável, a rota do webhook RECUSA tudo — é melhor a integração ficar
   * fora do ar do que aberta para qualquer um gravar evento de rede.
   *
   * Opcional porque o resto do sistema sobe sem ela: quem não usa UniFi registra as quedas
   * à mão, pela própria tela.
   */
  UNIFI_WEBHOOK_TOKEN: z
    .string()
    .trim()
    .min(16, 'O segredo do webhook precisa ser longo')
    .optional(),

  /**
   * O ADMIN-CONSOLE — quem faz o login das pessoas e diz quem pode entrar aqui.
   *
   * O login não acontece neste sistema: o proxy (Traefik) pergunta ao admin-console a cada
   * requisição e injeta quem é a pessoa em quatro cabeçalhos `x-forwarded-user-*` (ver
   * `lib/auth/identity.provider.ts`). Estas variáveis servem para o SERVIDOR conversar com ele
   * sem ninguém na frente — a lista de quem tem acesso (seletor de responsável, tela de
   * acessos) e o perfil de cada pessoa.
   *
   * `ADMIN_CONSOLE_URL` é o endereço que ESTE servidor alcança (pode ser o interno da rede do
   * Coolify). Sem ela, o sistema sobe, mas as listas de pessoas ficam vazias.
   */
  ADMIN_CONSOLE_URL: z
    .string()
    .trim()
    .url('ADMIN_CONSOLE_URL precisa ser uma URL completa')
    .optional(),

  /**
   * O token de serviço do sistema, gerado na tela do sistema no admin-console
   * (`um_chamados_…`). Aparece uma vez só lá; perdeu, gera outro. É segredo de servidor.
   */
  ADMIN_CONSOLE_TOKEN: z.string().trim().default(''),

  /** Prazo de cada leitura no admin-console: um serviço lento não pode pendurar a tela. */
  ADMIN_CONSOLE_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(4_000),

  /**
   * O endereço PÚBLICO da tela de login do admin-console — para onde "Minha conta" leva.
   * É o que a pessoa vê na barra de endereço (ex.: `https://login.grupoazuos.com.br`).
   */
  ADMIN_CONSOLE_LOGIN_URL: z
    .string()
    .trim()
    .url('ADMIN_CONSOLE_LOGIN_URL precisa ser uma URL completa')
    .optional(),

  /**
   * A PESSOA DE DESENVOLVIMENTO — só para a máquina de quem programa.
   *
   * Sem proxy na frente não há cabeçalho nenhum, e sem identidade nenhuma tela do painel
   * abre. Com o mock ligado, requisição SEM cabeçalho vira a pessoa fixa de
   * `identity.provider.ts`. Em produção ele é RECUSADO na partida (ver `parseEnv`): lá, uma
   * requisição sem cabeçalho é alguém que chegou à API sem passar pelo proxy.
   *
   * Sem valor: ligado fora de produção, desligado em produção.
   */
  USER_MOCK: z.enum(['true', 'false']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return assertNoMockInProduction(result.data);

  const details = result.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment. Check .env against .env.example:\n${details}`);
}

/**
 * O mock está ligado? Explícito vence; sem valor, vale "fora de produção".
 */
export function isUserMockEnabled(env: Pick<Env, 'USER_MOCK' | 'NODE_ENV'>): boolean {
  if (env.USER_MOCK !== undefined) return env.USER_MOCK === 'true';

  return env.NODE_ENV !== 'production';
}

/**
 * Mock em produção é porta aberta: toda requisição sem cabeçalho viraria a pessoa fixa. O
 * processo recusa subir em vez de subir aberto.
 */
function assertNoMockInProduction(env: Env): Env {
  if (env.NODE_ENV !== 'production' || env.USER_MOCK !== 'true') return env;

  throw new Error(
    'Invalid environment. Check .env against .env.example:\n  USER_MOCK: USER_MOCK cannot be true in production',
  );
}
