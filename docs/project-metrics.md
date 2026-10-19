# Métricas e autoria do projeto

`docs/project.json` é o cadastro versionado. Chaves e valores enumerados são em inglês;
dados conhecidos preservam sua origem e desconhecidos permanecem `null`. A política de
privacidade e as decisões pendentes estão em [`metrics-privacy.md`](./metrics-privacy.md).

## Participantes e commits

O padrão é um participante com ID aleatório opaco, papel e ferramentas. Nome, e-mail,
departamento e experiência prévia são opcionais. Não é necessário ter conta no GitHub.
Em contas compartilhadas, o Claude confirma a pessoa/código da conversa; não atribui
silenciosamente o histórico da conta à pessoa recém-identificada.

Os novos commits preservam `[tipo](local): Mensagem` e levam apenas:

```text
Participant-Id: p-<32 caracteres hexadecimais aleatórios>
Participant-Role: business
AI-Tool: Claude Code
```

Os trailers não repetem nome, e-mail e departamento. Um perfil identificado opcional pode
ser salvo em um commit próprio de cadastro quando a pessoa solicitar, com governança revista,
aviso registrado e repositório restrito. A validação recusa coleta identificada nova sem essas
condições. O Git continua tendo seus próprios metadados de autor; pseudonimização de métricas
não é anonimização de todo o repositório.

`legacy_ids` preserva referências anteriores nos cadastros privados migrados. O histórico é
validado usando o cadastro de cada commit, sem reescrever mensagens antigas. A migração do modo
identificado para pseudonimizado não invalida os commits anteriores.

## Dados e evidências

- `participants`: pessoas e automações, papéis e dados opcionais de perfil.
- `shared_accounts`: conta compartilhada e possíveis participantes; não comprova autoria individual.
- `tools`: ferramentas conhecidas. `AI-Tool` indica a usada naquela entrega.
- `milestones`: marcos confirmados; primeiro commit não substitui início, MVP ou produção.
- `requirements_meetings`: quantidade confirmada, ou `null`.
- `technical_blockers`: bloqueios documentados; lista vazia significa nenhum registro coletado.
- `technical_interventions`: intervenções documentadas, separando funcionalidade complementar,
  correção de padrão, recuperação de ambiente e integração. Commits são evidências, não eventos
  independentes; não calcular duração por diferença entre datas de commits.
- `traditional_estimate_days`: estimativa declarada; não é um ganho efetivamente medido.
- `pending_fields` e `evidence`: pendências necessárias e origem das informações.
- `privacy`: minimização, visibilidade observada e decisões de governança ainda não concluídas.

O tipo distingue `application`, `template` e `shared_resource`; template e marca não entram
automaticamente no denominador de MVPs em produção. Os dados de respostas/documentos de RH
não fazem parte deste cadastro nem do relatório do método.

## Validação e regras de código

Os scripts são módulos `.mjs` em `.github/scripts/project-metrics`, com Node 24 LTS e biblioteca
padrão. Não há dependência Python. Domínio, Git e entrada de CLI ficam separados. As regras do
projeto também valem para scripts e hooks: early return, complexidade até 10, profundidade até 2,
export nomeado, inglês em identificadores/erros internos/testes e português em comentários e
mensagens voltadas à pessoa.

```bash
node .github/scripts/project-metrics/validate-metrics.mjs --check
node --test '.github/scripts/project-metrics/*.test.mjs'
node --test '.claude/hooks/**/*.test.mjs'
npm exec --yes --package=eslint@9.39.5 -- eslint --config .github/scripts/eslint.config.mjs .github/scripts/project-metrics .claude/hooks --no-error-on-unmatched-pattern
```

O comando de testes dos hooks só se aplica quando `.claude/hooks` existir. ESLint é ferramenta
de desenvolvimento, executada no CI e no pre-commit quando há alterações nos scripts/hooks;
o validador de métricas em si não instala pacotes nem consulta a rede.

O hook `commit-msg` lê `:docs/project.json` do **índice Git**, e não um JSON corrigido apenas no
disco. Compara papel/ID/ferramenta e mudanças de perfil. Funciona no terminal, no Tower e no
Claude, inclusive em modo administrador, sem substituir o commitlint original.

O CI valida o cadastro, executa lint e testes de métricas/hooks e confere cada commit novo.
SHA é a chave de deduplicação. Merges e fotografias herdadas do template precisam de classificação
separada antes de contar entregas. Quantidade de commits não equivale a esforço ou produtividade.

## Hooks do Claude

As listas de proteção usam a pasta real de cada projeto. Ausência de regra, JSON inválido ou
falha de leitura é informada e bloqueia a operação; não vira permissão silenciosa. O guard verifica
caminhos relativos e destinos de links simbólicos e cobre todos os arquivos de edições múltiplas.
O modo administrador continua permitindo manutenção da estrutura; métricas não têm essa exceção.

A varredura de design ignora diretórios gerados e links simbólicos, respeita os apps de cada
projeto, trata caminhos relativos e só varre quando o evento está no escopo. As regras existentes
e a dívida conhecida são preservadas; atualizar a baseline não pode absorver violações novas.
Esses hooks auxiliam o fluxo do agente e não constituem um sandbox de comandos shell arbitrários.
