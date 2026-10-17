# Azuos Chamados

MVP para validar uma ideia com gente de verdade usando, construído a partir de um template de código com padrão consistente.

Foi feito para ser usado **com o Claude Code no VS Code**. Você descreve o que o sistema precisa fazer, em português; o Claude constrói seguindo as regras deste repositório. As regras não dependem de você decorar nada: elas estão escritas para o Claude (`CLAUDE.md`), viram passo a passo nas skills (`.claude/skills/`) e são conferidas por máquina (lint, testes, commit).

---

## O que você precisa ter instalado

| Ferramenta                            | Versão              | Para quê                                            |
| ------------------------------------- | ------------------- | --------------------------------------------------- |
| **Node.js**                           | **24 LTS** (não 25) | Roda o sistema                                      |
| **Git**                               | qualquer recente    | Guarda o histórico das mudanças                     |
| **VS Code**                           | qualquer recente    | Onde você trabalha                                  |
| **Claude Code** (extensão do VS Code) | —                   | Quem constrói com você                              |
| **Tower**                             | qualquer recente    | Ver o histórico e as branches (Git-Flow) — opcional |
| **Python**                            | 3.12                | Usado por algumas ferramentas do Claude             |

O banco é o **Postgres do Supabase** do Grupo Azuos e os arquivos ficam no **Storage** dele,
pela API S3 — não precisa instalar nada localmente, mas precisa estar na rede (ou VPN) do servidor
de homologação. Veja "Variáveis de ambiente" mais abaixo.

Para conferir, abra o terminal do VS Code (`Ctrl+'`) e rode:

```bash
node -v # precisa começar com v24
git --version
```

---

## Criando um MVP a partir deste template

1. No GitHub, abra este repositório e clique em **Use this template → Create a new repository**.

2. Dê o nome do seu MVP e crie.

3. Clone o repositório novo e abra a pasta no VS Code.

4. Abra o Claude Code e digite: **`/comecar`**

A skill `getting-started` instala tudo, sobe o sistema, grava os dados de teste e abre no navegador.

Em seguida, peça **`/renomear-projeto`** para o nome do seu MVP aparecer nas telas.

<details>
<summary>Prefere fazer à mão? São quatro comandos.</summary>

```bash
cd chamados/dashboard # o sistema fica uma pasta abaixo da raiz
npm install # baixa as dependências (demora alguns minutos na primeira vez)
npm run seed:all # cria o banco e grava os dados de teste
npm run dev # sobe o sistema
```

Abra **<http://localhost:5005>**. A documentação da API fica em **<http://localhost:3005/docs>**.

</details>

---

## Como pedir as coisas ao Claude

Fale do **resultado**, não do código:

> **"Quero cadastrar clientes com nome, telefone e cidade, e ver a lista filtrando por cidade."**

> **"Na tela de clientes, quero um botão para exportar a lista."**

> **"Preciso de dados de teste com uns 20 clientes de cidades diferentes."**

> **"Deu esse erro quando cliquei em salvar: (cole o erro aqui)"**

### As skills

Skills são receitas prontas. O Claude usa sozinho quando o pedido combina, e você também pode chamar pelo nome, com `/`:

| Skill                | Para quê                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| `/comecar`           | Primeiro uso: instala, sobe o sistema e explica o que tem aqui            |
| `/renomear-projeto`  | Coloca o nome do seu MVP no título das telas e no README                  |
| `/nova-feature`      | Uma funcionalidade inteira: banco, API, tela, testes e seed               |
| `/componente-ui`     | Um componente de tela novo, com story e teste                             |
| `/ui-padrao`         | As regras de visual e de texto — cores, estados, botões, mensagens        |
| `/banco-de-dados`    | Criar ou mudar tabela, gerar migration, recriar o banco                   |
| `/dados-de-teste`    | Criar ou mudar os dados de teste (seeds)                                  |
| `/git-commit`        | Salvar o trabalho no histórico, no formato certo                          |
| `/git-fluxo`         | O ciclo de toda mudança: branch de feature → trabalho → seu OK → develop  |
| `/resolver-conflito` | Explica e resolve conflito pela tela afetada, com quem mudou e quando     |
| `/verificar`         | Conferir se está tudo pronto para entregar (lint, testes, build)          |
| `/socorro`           | Os problemas mais comuns e como resolver                                  |
| `/limites-do-mvp`    | O que o MVP não faz e a quem pedir                                        |
| `/suporte`           | Erro grande: para, guarda o trabalho e prepara o relatório para o suporte |

---

## Estrutura

A raiz do repositório só guarda documentação e configuração de equipe. O sistema inteiro vive em `chamados/dashboard/`.

```text
chamados/                             # raiz do repositório git
├── README.md · CONTRIBUTING.md         # para pessoas
├── CLAUDE.md                           # para o Claude
├── .claude/skills/                     # as receitas do Claude
├── .github/                            # CI e modelo de PR
├── .vscode/                            # configuração e extensões recomendadas
│
└── chamados/
    └── dashboard/                      # o sistema — "npm install" roda aqui
        ├── package.json                # workspaces: shared, server, client
        │
        ├── shared/                     # @template/shared — o CONTRATO entre API e tela
        │   └── src/
        │       ├── domain/             # regra de negócio pura (testável sem nada)
        │       └── schemas/            # schemas Zod: validação na API e no formulário
        │
        ├── server/                     # API NestJS
        │   ├── drizzle/                # migrations versionadas (geradas)
        │   ├── test/                   # E2E da API
        │   └── src/
        │       ├── modules/<feature>/  # controller/ service/ repository/ mapper/ dto/
        │       └── lib/
        │           ├── auth/            # identidade pelo admin-console e trava por módulo
        │           ├── config/          # variáveis de ambiente (Zod)
        │           ├── db/              # conexão Postgres (Supabase, schema chamados), tabelas Drizzle
        │           ├── storage/         # arquivos pelo protocolo S3 (Supabase Storage)
        │           ├── http/            # formato único de erro
        │           └── policy/          # quem pode o quê
        │
        ├── client/                      # tela SvelteKit
        │   ├── e2e/                     # E2E da web (Playwright)
        │   └── src/
        │       ├── routes/              # uma pasta por tela — só composição
        │       └── lib/
        │           ├── components/ui/   # ⛔ componentes baixados do shadcn-svelte — não se edita
        │           ├── components/      # nossos componentes (um por pasta)
        │           ├── navigation/      # o menu lateral
        │           ├── hooks/           # estado e dados de cada tela — sem marcação
        │           ├── api/             # chamadas à API
        │           ├── theme/tokens.css # cores e tipografia da marca
        │           └── brand/            # nome do projeto na barra lateral
        │
        ├── scripts/seed/<entidade>/     # dados de teste versionados
        └── docker/                      # uma imagem: API + tela na mesma porta
```

---

## Stack

| Camada                          | Escolha                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| **Backend**                     | NestJS 11 + Swagger (`nestjs-zod`)                          |
| **Banco**                       | **Postgres** do **Supabase** via **Drizzle ORM**             |
| **Arquivos**                    | Supabase Storage pela API S3                                 |
| **Frontend**                    | SvelteKit (Svelte 5) + Vite + TypeScript                     |
| **Dados / Formulários**         | TanStack Query · Form (versões Svelte)                       |
| **Validação**                   | Zod — o mesmo schema na API e na tela                       |
| **UI**                          | shadcn-svelte + Tailwind v4 · ícones Lucide · animação GSAP |
| **Documentação de UI**          | Storybook                                                   |
| **Testes**                      | Vitest · Testing Library · Supertest · Playwright · Stryker |
| **Qualidade**                   | ESLint + Prettier · commitlint + husky                      |

### O banco é compartilhado com os outros sistemas

O Postgres é o mesmo do Paralegal, da Gestão de RH e do admin-console. Cada sistema mora num
**schema** próprio, e as tabelas deste estão em `chamados` (`chamadosSchema.table(...)` em
`server/src/lib/db/schema/`, nunca `pgTable`). A lista de migrations também é própria:
`drizzle.__chamados_migrations` — a padrão do Drizzle já é de outro sistema. O `drizzle.config.ts`
só enxerga o schema `chamados`, para uma migration nunca tocar nas tabelas dos outros.

### Os arquivos vão direto para o storage

Os arquivos seguem o mesmo arranjo do Paralegal, da Gestão de RH e do admin-console: protocolo
S3 puro (`S3_*` no `server/.env`), num bucket privado `chamados`. Trocar de provedor é trocar as
variáveis.

**O arquivo nunca passa pela API.** Todo envio — o print e os anexos do chamado, os anexos de um
histórico, a foto do inventário, o documento do orçamento — segue três passos:

1. a tela pede o link (`POST .../upload-url`); a API confere **quem pode** (no service) e devolve
   uma chave na área temporária (`tmp/`) e um link assinado de envio (PUT, 5 minutos);
2. o navegador envia o arquivo **direto** para o storage por esse link;
3. a tela grava o chamado, o histórico, o produto ou o orçamento levando a chave. Só então a API
   confere o arquivo **de verdade** (tamanho e tipo medidos pelo storage, não os declarados pela
   tela), recusa o que não serve e move o resto para a pasta definitiva (`tickets/`,
   `ticket-attachments/`, `inventory/`, `maintenance-quotes/`).

O que fica na área temporária sem ser gravado é apagado de hora em hora, depois de 24 horas.
Para **abrir ou baixar**, a API devolve um link assinado de GET (5 minutos). Os arquivos gravados
antes deste fluxo continuam onde estavam: mesmas chaves, mesmo bucket.

O `S3_ENDPOINT` é sempre o endereço **público** — é ele que vai nos links que o navegador abre:

| Ambiente | `S3_ENDPOINT` | `S3_REGION` | `S3_SIGNING_HOST` |
|---|---|---|---|
| Homologação | `https://s3.homo.grupoazuos.com.br/storage/v1/s3` | `local` | `s3.homo.grupoazuos.com.br:8001` |
| Produção | `https://<projeto>.supabase.co/storage/v1/s3` | região do projeto | vazio |

Na homologação o `S3_SIGNING_HOST` é obrigatório: o domínio público chega ao Kong do Supabase
self-hosted pela 8001, e o Storage confere a assinatura com essa porta. Sem ele, toda chamada
volta `SignatureDoesNotMatch` (medido no Paralegal, contra o mesmo Supabase).

---

## Comandos

Os documentos (PDF, Word e Excel) são gerados por bibliotecas do próprio projeto — `pdfmake`,
`docx` e `exceljs` —, instaladas pelo `npm install`: nenhum programa à parte é necessário.
Instale as ferramentas e inicie o servidor com o ambiente do mise:

```bash
mise install
cd chamados/dashboard
mise exec -- npm run dev
```

Depois de instalar uma ferramenta nova, reinicie o servidor para atualizar seu `PATH`.


Todos rodam dentro de `chamados/dashboard/`:

| Comando                           | O que faz                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                     | Sobe API (:3005) e tela (:5005), recarregando a cada mudança                 |
| `npm run seed:all`                | Grava os dados de teste (pode rodar quantas vezes quiser)                    |
| `npm run db:reset`                | **Apaga** os dados do schema `chamados` e recria com os dados de teste       |
| `npm run db:generate`             | Gera a migration depois de mudar uma tabela                                  |
| `npm run db:studio`               | Abre o Drizzle Studio para olhar o banco                                     |
| `npm test`                        | Testes de unidade e de componente                                            |
| `npm run test:e2e`                | E2E da API e da tela (a tela pede `npx playwright install chromium` uma vez) |
| `npm run test:mutation`           | Stryker — lento de propósito                                                 |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                            |
| `npm run typecheck`               | Confere os tipos do TypeScript                                               |
| `npm run build`                   | Build de produção                                                            |
| `npm run storybook`               | Catálogo de componentes em :6006                                             |

### Docker

A imagem final inclui as fontes e a logo dos documentos, copiadas pelo build do Nest. O
`dockerfile` ainda traz o executável do Typst, de quando os PDFs eram compilados por ele: o
sistema não o usa mais, e a remoção é de quem administra o projeto (o arquivo é protegido).


```bash
cd chamados/dashboard
docker compose -f docker/compose.yml up --build
```

Uma imagem só: o Nest serve `/api` **e** a tela na mesma porta. O banco (Postgres do Supabase) e
os arquivos (storage S3) são remotos, então não há volume de dados — o container precisa só das
variáveis do `server/.env` (`DATABASE_URL`, `S3_*`) para subir.

Em produção o container fica atrás de um proxy (Traefik, Caddy ou nginx), e parte da proteção é
configurada nele — tamanho máximo de upload, limite das rotas públicas, `API_TRUST_PROXY_HOPS`.
Os exemplos prontos estão em [`chamados/dashboard/docs/reverse-proxy.md`](chamados/dashboard/docs/reverse-proxy.md).

O bot de WhatsApp é um programa à parte (`chamados/dashboard/bot/`) que sobe dentro do mesmo
container quando `BOT_API_TOKEN` e `BOT_SESSION_KEY` estão configurados — ver
[`chamados/dashboard/docs/whatsapp-bot.md`](chamados/dashboard/docs/whatsapp-bot.md).

---

## Autenticação e autorização

**Este sistema não faz login.** Quem identifica as pessoas é o
[admin-console](https://github.com/grupo-azuos/admin-console) do Grupo Azuos, pelo proxy: o
Traefik do Coolify pergunta a ele a cada requisição (`forwardAuth`) e injeta quem é a pessoa em
quatro cabeçalhos — `x-forwarded-user-id`, `-email`, `-name` e `-role`. É o mesmo arranjo do
Paralegal. Trocar senha, foto e sair é na conta da pessoa, lá ("Minha conta", na barra lateral).

### Quem pode o quê

São duas peças, de dois lugares:

- **o papel** (Administrador · Gestor · Usuário) é o que o admin-console deu à pessoa neste sistema;
- **os módulos** (Infraestrutura · Sistema · Manutenção) são liberados aqui, pelo **super-admin**, no
  perfil dele ("Acessos por módulo").

| Papel no admin-console | Com o módulo | Sem módulo nenhum |
|---|---|---|
| Administrador | mexe em tudo daquele módulo (e atende os chamados da área) | só abre chamado, acompanha os seus e valida documento |
| Gestor | só vê os dados do módulo | só abre chamado, acompanha os seus e valida documento |
| Usuário | só vê os dados do módulo | só abre chamado, acompanha os seus e valida documento |

**O super-admin** vê e altera todas as telas e é o único que libera módulos. Ele não nasce de
clique nenhum, só do comando, rodado por quem tem o `.env` do servidor:

```bash
cd chamados/dashboard
npm run superadmin:promote -- pessoa@azuoscontabil.com.br
npm run superadmin:promote -- pessoa@azuoscontabil.com.br --remove
```

**Não há rota pública.** Abrir chamado (`/support`) e validar documento (`/verify`) também passam
pelo login: qualquer pessoa com acesso ao sistema no admin-console — mesmo sem módulo nenhum —
abre chamado, e o chamado fica ligado a ela pelo id (`requester_id`). O formulário já vem
preenchido com os dados do perfil dela no admin-console: o nome é travado (é a identidade);
telefone e departamento ela confirma ou corrige. Ela acompanha em "Meus chamados" ou pelo número
— e só enxerga os próprios (ou os de uma área que atende).

O perfil vem de `GET /api/me/profile` do admin-console, que só aceita a sessão da própria pessoa:
o servidor do chamados repassa o cookie de ACESSO dela (`<ADMIN_CONSOLE_COOKIE_PREFIX>_access_token`)
e nunca o de renovação — reapresentado por outro processo, o admin-console o trata como roubo e
derruba a sessão.

**Pelo WhatsApp** (`/acesso`), o bot pergunta o nome e procura a pessoa no admin-console
(`GET /api/users?search=`). Se mais de uma tem aquele nome, ganha quem já abriu chamado com o
mesmo telefone; sem desempate, o bot pergunta "qual delas é você?". Reconhecida, o pedido fica
ligado à conta dela e o e-mail não é perguntado. Ninguém bate: o pedido segue sem vínculo, como
antes.

**Histórico.** Toda mudança feita pela API (criar, alterar, apagar) vira uma linha em
`chamados.history`, no mesmo formato do histórico do admin-console: ação, quem (`actor_id`,
`actor_email`; nulo quando foi máquina), alvo, IP, navegador e os campos enviados (`changes`).
Segredo não entra, e texto longo é cortado. A gravação é automática (`HistoryInterceptor`); falha
no histórico vai para o log e não desfaz a mudança.

No código, a regra está em `shared/src/domain/module-access.util.ts`; toda rota da API declara
o módulo dela (`@ModuleContext('infra')`), e a trava global (`RolesGuard`) recusa quem não tem o
módulo e recusa escrita de quem só consulta. Rota sem módulo declarado nasce **fechada**.

### Na sua máquina

Sem proxy não há cabeçalho, e o servidor usa a **pessoa de desenvolvimento**
(`dev@chamados.local`, `USER_MOCK`, ligada fora de produção e recusada em produção). Ela começa
sem módulo nenhum, como qualquer pessoa; para ver o painel inteiro:

```bash
npm run superadmin:promote -- dev@chamados.local
```

### Em produção — o que não é do código

1. **O container só é alcançável pelo proxy.** O sistema confia nos cabeçalhos sem perguntar de
   onde vieram — é assim que auth-forward funciona. Sem porta publicada, sem router direto.
2. **Um router com o login** (`forwardAuth` do admin-console, com `addAuthCookiesToResponse`) para
   tudo — telas e API. **O cookie NÃO é removido** antes do app: o servidor precisa do cookie de
   acesso para ler o perfil de quem abre chamado.
3. **Um router SEM login só para máquinas**, que se identificam com token próprio: o agente
   (`Path(/agent)`), a consulta de atualização (`GET /api/agent/releases/latest`) e o webhook
   da UniFi (`Path(/api/network/webhook)`). Ele apaga os
   `x-forwarded-user-*` que vierem de fora. O bot do WhatsApp fala com o servidor pela rede interna.

As variáveis (`ADMIN_CONSOLE_URL`, `ADMIN_CONSOLE_TOKEN`, `ADMIN_CONSOLE_LOGIN_URL`,
`ADMIN_CONSOLE_COOKIE_PREFIX`, `USER_MOCK`) estão explicadas em `server/.env.example`. Os passos do lado do admin-console
(cadastrar o sistema `chamados` com o host, gerar o token de serviço) estão no README dele.

## O que o MVP não faz

* **Isolamento de dados não é automático.** O banco é o Postgres do Supabase — compartilhado por
  natureza. Quem usa a mesma `DATABASE_URL` vê os mesmos dados. Para cada pessoa ter o próprio
  banco de trabalho, cada uma precisa de um Postgres próprio, configurado no `server/.env`.

* **Infraestrutura de produção automaticamente.** O template fornece a aplicação e o suporte à autenticação, mas publicação, domínio, proxy, secrets e demais recursos de produção precisam ser configurados conforme o ambiente.

* **Consertar a estrutura sem aprovação.** Se algo grande quebrar (não instala, não abre, o banco não carrega), o Claude para, guarda o seu trabalho e prepara um relatório para você investigar com calma.

### Como a identidade funciona

Ver "Autenticação e autorização", acima: a identidade vem do admin-console, pelo proxy; os
módulos de cada pessoa são deste sistema; na sua máquina vale a pessoa de desenvolvimento.

---

## Variáveis de ambiente

Nada é obrigatório para rodar na sua máquina: todo valor tem padrão. Os exemplos ficam em `server/.env.example` e `client/.env.example` — copie para `.env` só quando precisar trocar algo.

> **Segredo nunca em variável `VITE_`.** Tudo que tem esse prefixo vai para o navegador e é público. Chave de API, senha, token: só no `server/.env`.

---

## Versões

A tag `agent/vX.Y.Z` gera os arquivos do agente e os publica no mesmo bucket S3 privado
usado pelo dashboard. O agente instalado pode coletar e se atualizar antes do login. Configuração de Secrets, certificado e primeira instalação:
[guia de releases do agente](chamados/agent/docs/releases.md).

Node na linha **LTS, com a faixa fechada** — `>=24.0.0 <25.0.0`. As travas (ESLint 9, TypeScript 5, NestJS 11) e o motivo de cada uma estão na [seção 13 do CONTRIBUTING](CONTRIBUTING.md#13-versões--só-o-que-ainda-tem-suporte).

---

## Fluxo de trabalho

O fluxo é o **Git-Flow do Tower**. O `npm install` já configura o Git-Flow no repositório, e o Tower abre com tudo inicializado.

**Como é na prática — você não precisa fazer nada disso à mão:**

1. Você pede uma mudança ao Claude.

2. Ele cria uma branch `feature/…` a partir da `develop` e trabalha nela. A versão principal não é afetada.

3. Quando termina, ele traz as novidades da `develop`, confere tudo, sobe o sistema e mostra como testar.

4. Ele pergunta: **"Está funcionando do jeito que você queria?"**

5. **Só com o seu OK** ele junta na `develop` (`merge --no-ff`) e envia para o GitHub.

Se duas pessoas mexeram na mesma parte, o Claude explica o conflito pela tela, por exemplo:

*"na tela Clientes, dia 14/09, a Ana mudou o botão de cadastro; nesta mudança, colocamos o filtro por cidade no mesmo lugar"*.

Ele mantém as duas mudanças quando dá, e pergunta quando não dá.

**A `main` é de quem administra o projeto.** O git recusa commit, merge e envio para ela em qualquer outra máquina, com uma mensagem em português dizendo o que fazer.

**Commits:** `[tipo](local): Mensagem`, verificados no hook de `commit-msg`. Os detalhes estão no [`CONTRIBUTING.md`](./CONTRIBUTING.md), seções 11 e 12.

---

## Para quem administra

Uma vez, na **sua** máquina, para poder mexer na `main` e na estrutura do projeto (regras de lint, hooks, CI, Docker…):

```bash
git config project.admin true
```

A chave fica só no `.git/config` do seu clone — não é versionada e não libera mais ninguém.

Ela libera as duas travas: o hook do git e o hook do Claude Code.

A lista do que é protegido fica em `chamados/dashboard/scripts/git/protected-structure.txt` (§17 do CONTRIBUTING). Login e autenticação não fazem mais parte dessa lista — ver CONTRIBUTING §17.

No GitHub, proteja a `main` (o hook local não pega merge **fast-forward**, e quem tem o clone pode desligar hooks): **Settings → Branches → Add branch ruleset** para `main`, com **Restrict updates** e **Require a pull request before merging**, liberando só você. Marque também o repositório como **Template repository** (Settings → General).

Versões: a partir da `develop`, pelo Git-Flow do Tower (**Start Release** / **Finish Release**), com tag `v<versão>`.

---

## Licença

O código deste projeto é distribuído sob a licença **MIT** — veja o arquivo [`LICENSE`](./LICENSE). Em resumo: pode usar, copiar, modificar e redistribuir, inclusive comercialmente, desde que o aviso de direitos autorais seja mantido.

**As dependências têm as licenças delas.** A regra do que pode entrar fica em [`license-policy.json`](./license-policy.json), e é conferida a cada PR:

```bash
mise run licenses:check    # confere Node (painel e tela do agente) e Go (agente)
mise run licenses:list     # mostra a licença de cada dependência
```

Dependência com licença que não está na lista **reprova o PR**. O caminho é trocar a dependência ou, depois de avaliar, registrar uma exceção com o motivo escrito no próprio `license-policy.json`.

> **Aviso:** a licença MIT cobre só o código deste repositório, **não as dependências**. Em
> especial, o **GSAP** (as animações da tela) **não é código aberto**: é distribuído sob a
> licença própria da Webflow, e este projeto não o relicencia. Leia
> [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md) antes de redistribuir.

O mesmo arquivo explica o pacote sem licença declarada que vem do `exceljs`.
