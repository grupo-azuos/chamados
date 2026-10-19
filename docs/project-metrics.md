# Métricas e autoria do projeto

`docs/project.json` é o cadastro versionado. Nomes de arquivo, chaves e valores enumerados são em
 inglês; nomes de pessoas e departamentos preservam a informação declarada. Não contém senhas,
 tokens ou dados de clientes. Dados pessoais de participantes são apenas os necessários à autoria.

## Dados e origem

- `participants`: pessoas e automações, com ID estável, nome, e-mail, departamento, papel,
  contas GitHub, variantes de e-mail Git e experiência prévia em TI. `null` é informação pendente.
- `shared_accounts`: contas compartilhadas e possíveis participantes; essa relação não prova quem
  fez um commit antigo. Autoria não resolvida deve continuar não resolvida.
- `tools`: ferramentas conhecidas no projeto. O trailer `AI-Tool` identifica a ferramenta de cada
  nova entrega. O padrão Claude Code + VS Code vem do template; não é inferido para o passado.
- `milestones`: início real, MVP, produção e abandono, confirmados por pessoas/evidências. A data
  do primeiro commit é armazenada separadamente em `evidence`, sem substituir esses marcos.
- `requirements_meetings`: quantidade confirmada; `technical_blockers`: descrição, dias e evidência
  dos bloqueios; `traditional_estimate_days`: estimativa declarada, nunca ganho medido.
- `pending_fields`: informações a completar; `evidence`: fonte das informações conhecidas.

`project_type` diferencia `application`, `template` e `shared_resource`. Todos recebem cadastro,
mas template e marca não entram automaticamente no denominador de MVPs em produção. O status
pode ser `prototype`, `integration`, `production`, `abandoned` ou `null` quando não confirmado.

## Fluxo

O Claude usa `participant-identity` no início da sessão e antes de commits/merges. Em conta
compartilhada, confirma quem está trabalhando. Pergunta somente os dados ausentes e salva o
cadastro. Não atribui o histórico da conta à pessoa recém-identificada.

Todo commit continua no formato do projeto: `[tipo](local): Mensagem`, em português. O bloco
final contém `Participant-Id`, `Participant-Name`, `Participant-Email`, `Department`,
`Participant-Role` e `AI-Tool`. O responsável do commit precisa ter cadastro completo, mesmo
quando outros participantes históricos ainda têm pendências. Commits são atômicos; dados novos
necessários à atribuição acompanham a mudança que depende deles.

## Validação

É necessário **Python 3** (biblioteca padrão; nenhuma instalação de pacote Python). O hook
`commit-msg` existente continua verificando o título e também executa:

```bash
python3 .github/scripts/project-metrics/validate-metrics.py --message <arquivo-da-mensagem>
```

A validação lê `:docs/project.json` do **índice Git**, portanto não aceita um cadastro corrigido
apenas na cópia de trabalho. Compara cada trailer com o participante, exige e-mail válido e
ferramenta cadastrada. Não há exceção de métricas para administrador. Não verifica a identidade
civil de quem respondeu e não mede prompts, horas ou tentativas que não foram registrados.

```bash
python3 .github/scripts/project-metrics/validate-metrics.py --check
python3 .github/scripts/project-metrics/test-metrics.py
python3 .github/scripts/project-metrics/validate-metrics.py --range <base> <head>
```

O workflow de métricas repete a validação no CI para PRs e pushes, inclusive merges. Commits
anteriores à existência do cadastro não são alterados nem obrigados a ganhar trailers. SHA é a
chave de deduplicação; merges e commits herdados do template devem ser classificados à parte
antes de comparar entregas. Quantidade de commits não equivale a esforço ou produtividade.

Os mecanismos existentes de proteção de branch, lint e testes continuam ativos. Python precisa
estar disponível também para quem commita pelo Tower. Não usar `--no-verify`.
