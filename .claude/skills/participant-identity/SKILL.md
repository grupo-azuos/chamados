---
name: participant-identity
description: Identifica a pessoa por um código opaco, completa somente os dados necessários às métricas e atribui commits atômicos. Use no início da sessão, antes de mudanças, commits e merges, especialmente com contas compartilhadas. Nome e e-mail são opcionais.
---

# Participante e métricas

Leia `docs/project.json`, `docs/metrics/project-metrics.md` e `docs/privacy/metrics-privacy.md`.

## Aviso antes da coleta

Siga `docs/privacy/metrics-notice-flow.md`. Consulte primeiro `privacy.controller_source` e os
responsáveis já documentados em `docs/project.json`; não peça de novo razão social ou contato
que a fonte existente já informa. Inclua o responsável pelo relatório/artigo e essa finalidade
mesmo para circulação interna, sem confundi-lo com controlador ou encarregado. No primeiro contato da conversa, antes de solicitar
identidade ou dados para métricas, apresente ao usuário o texto completo produzido por
`privacyNotice` em `.github/scripts/project-metrics/privacy-notice.mjs`, com o cadastro
atual. O SessionStart já fornece esse texto; saída de hook não conta como exibição ao usuário.
Mostre-o na conversa, não só um link. Reapresente se mudar a versão, condições ou pessoa.
Se já foi apresentado à mesma pessoa nesta conversa, não repetir sem motivo.

Ciência não é consentimento: não exigir aceite para trabalhar. Governança pendente significa
mostrar o aviso provisório, informar as decisões faltantes e continuar ajudando com código
sem iniciar nova coleta de métricas por participante nem pedir nome/e-mail. ID também está
sujeito à LGPD. Não inventar decisões da empresa ou solicitar ao usuário comum que as aprove.

Com governança aprovada, após a apresentação efetiva e a confirmação da pessoa, registre
`notice_receipt` com versão vigente, instante real de apresentação e canal `agent_chat`,
conforme o documento. Não transcrever a conversa, presumir leitura ou criar recibos
retroativos. Esse registro não constitui consentimento ou autorização para publicação.

## Código da pessoa

Confirme quem está nesta conversa usando um código de participante já existente. Em conta
compartilhada, não reutilize a pessoa da sessão anterior e não associe todo o histórico da
conta a quem acabou de chegar. Se a pessoa não tiver código, gere um aleatório com
`p-${randomUUID().replaceAll('-', '')}` usando `node:crypto`; confirme o papel (`business`,
`technical` ou `automation`) e informe o código criado. Não exigir conta no GitHub, nome,
e-mail ou departamento. Não derivar o código de nome, e-mail ou login.

Se a pessoa já se identificou nesta conversa, use a informação; não pergunte novamente.
Procure o código no cadastro antes de criar outro. Códigos antigos aparecem em `legacy_ids`
apenas nos cadastros privados migrados; os novos trailers usam o ID opaco atual.

Registre apenas ID, papel e ferramentas efetivamente usadas. Os campos pessoais ausentes
continuam `null`, e listas de logins/e-mails continuam vazias. Experiência prévia em TI é
opcional; não a transformar em requisito para trabalhar nem confundir experiência com papel.

Confirme as ferramentas quando desconhecidas. Claude Code + VS Code é o padrão do template,
não prova sobre todas as entregas históricas. O nome da ferramenta usada entra em `AI-Tool`.

## Nome e e-mail opcionais

Não perguntar nome/e-mail como condição para gravar trabalho. Se a pessoa oferecer ou pedir
para cadastrar esses dados, explique o aviso de privacidade, o repositório de destino e o uso
proposto; registre somente os campos pedidos. Antes de persistir, confirme a visibilidade real
do repositório e as decisões de governança em `privacy`. Repositório público não recebe perfil
identificado; governança pendente significa continuar com o ID e encaminhar a decisão à empresa.
Nunca inventar a base legal ou tratar o oferecimento de um e-mail como consentimento irrestrito.

Quando as condições estiverem preenchidas, salve o perfil em um commit próprio de cadastro,
com `profile_disclosure` contendo pedido da pessoa, versão do aviso e data. Nome/e-mail ficam
no cadastro restrito, não nos trailers de cada mudança. O Git não restringe acesso por arquivo:
se a equipe do código não puder ler o cadastro, é necessário um armazenamento separado.
Cadastro de métricas não cria login no sistema e não altera `git config user.*`.

## Dados do projeto e commits

Ao criar um projeto a partir do template, confira o `origin`: `repository` deve identificar o
novo projeto e `project_type` deve refletir sua finalidade. Registre a origem do template em
`evidence`; não atribua seus autores automaticamente ao novo usuário. Não inventar marcos nem
contar a fotografia inicial do template como entrega do usuário.

Atualize apenas datas, reuniões e intervenções confirmadas. `null` significa desconhecido.
Primeiro commit, primeira PR e release não comprovam início, MVP ou produção. Intervenções ficam
em `technical_interventions`, com categoria, responsável, evidência e commits; vários commits
podem pertencer à mesma intervenção. Não inferir duração a partir do intervalo entre commits.

Siga `git-commit` e `CONTRIBUTING.md`: uma mudança coerente por commit e arquivos preparados por
caminho. Inclua o cadastro de um novo ID no primeiro commit que o utiliza. O hook lê o índice;
salvar o JSON no disco sem `git add` não basta. Preserve `[tipo](local): Mensagem`, com o bloco:

```text
Participant-Id: p-<32 caracteres hexadecimais aleatórios>
Participant-Role: business
AI-Tool: Claude Code
```

O papel e a ferramenta precisam corresponder ao cadastro. Não adicionar `Participant-Name`,
`Participant-Email` ou `Department` aos trailers novos. A regra também vale para manutenção,
merges e modo administrador. Automação usa seu próprio participante. A pessoa responsável por
cada commit deve ser confirmada; não inventar coautoria.

O hook recusou? Corrija o campo indicado, pedindo somente a informação necessária que ainda
falta, prepare novamente o arquivo e tente outra vez. Não desativar hooks nem usar
`--no-verify`. Não reescrever histórico e não distribuir cópias manuais do cadastro por branches.

O modo antigo identificado é aceito somente para validar o histórico existente. Os novos
projetos e commits usam o modelo pseudonimizado descrito acima. IDs não tornam os metadados
nativos de autor do Git anônimos. Relatório público usa agregados revisados, não o cadastro.
