---
name: participant-identity
description: Identifica a pessoa que está trabalhando no projeto, completa somente os dados ausentes em docs/project.json e atribui commits atômicos. Use no início da sessão, antes de mudanças, commits e merges, sobretudo com contas compartilhadas.
---

# Participante e métricas

Leia `docs/project.json` e `docs/project-metrics.md`. O cadastro é do projeto, não da conta GitHub.

1. Identifique a pessoa da conversa. Login e e-mail do Git ajudam a procurar cadastros, mas uma
   conta de `shared_accounts` nunca identifica uma pessoa. Em cada nova sessão compartilhada,
   pergunte quem está trabalhando, mesmo que exista só um participante cadastrado. Não reaproveite
   silenciosamente a identidade de outra sessão. Não pergunte novamente quando a pessoa já se
   identificou nesta conversa.
2. Procure um participante existente antes de criar outro. Peça em uma pergunta curta somente os
   campos obrigatórios ausentes: nome, e-mail pessoal/profissional de autoria, departamento e papel
   (`business`, `technical` ou `automation`). Não adivinhe sobrenome, departamento ou e-mail a partir
   do projeto. Use o nome declarado pela pessoa, com acentos. Cadastro de métricas não cria conta de
   acesso ao sistema e não altera `git config user.*` nem as regras de autenticação.
3. Atualize o participante em `docs/project.json`, incluindo `github_logins`, `git_emails` e, quando
   compartilhada, a relação em `shared_accounts[].participant_ids`. Não atribua todo o passado de
   uma conta compartilhada a quem se identificou agora. Preserve autores e pendências históricos.
   Registre em `evidence` a origem das confirmações, sem copiar a conversa inteira.
4. Confirme as ferramentas realmente usadas quando desconhecidas. Claude Code e VS Code são o
   padrão do template, não prova sobre toda entrega passada. Registre outras ferramentas em `tools`.
   Pergunte sobre experiência prévia em TI uma vez, sem bloquear trabalho por informação histórica
   indisponível. Guilherme é auxiliar técnico sem experiência prévia; não o classifique como
   usuário de negócio só para melhorar a métrica.
5. Atualize somente os marcos, reuniões e bloqueios que a pessoa confirmou. `null` significa
   desconhecido; zero é uma afirmação. Primeiro commit, primeira PR e release não provam data de
   início, MVP ou produção. Nunca reescreva histórico para inserir atribuição retroativa.
6. Separe mudanças por resultado/local conforme `git-commit` e `CONTRIBUTING.md`. Inclua o cadastro
   novo/corrigido no primeiro commit que depende dele, com `git add` por caminho. O hook lê o índice:
   salvar o JSON no disco sem prepará-lo para commit não basta.
7. Preserve `[tipo](local): Mensagem` e acrescente exatamente um de cada trailer abaixo, com
   valores iguais aos do participante cadastrado. `AI-Tool` é a ferramenta usada nesta entrega
   (use `none` em trabalho manual e cadastre essa opção em `tools`, quando necessário).

```text
Participant-Id: <id estável do participante>
Participant-Name: <nome confirmado>
Participant-Email: <e-mail confirmado>
Department: <departamento confirmado>
Participant-Role: <business|technical|automation>
AI-Tool: <ferramenta realmente usada>
```

Em trabalho conjunto, confirme a pessoa responsável por cada commit; não invente autoria de
colegas. Mantenha os demais participantes no cadastro e explique a colaboração no corpo do commit.
Os trailers valem também para merges, commits de manutenção e modo administrador. Não há exceção
para bot: cadastre a identidade da automação. O histórico anterior à adoção permanece intacto.

O hook recusou? Leia os campos indicados, pergunte apenas o que ainda falta, corrija e prepare os
arquivos novamente. Não desative hooks, não use `--no-verify` e não substitua dados ausentes por
`unknown`, `N/A`, dados da conta compartilhada ou dados de outra pessoa.

Para PRs, mantenha a mensagem de merge no padrão e inclua os trailers do responsável confirmado.
O CI valida todos os commits novos após a adoção. Ao trazer commits antigos, preserve o histórico.
Não distribua cópias do cadastro manualmente pelas branches de funcionalidades: ele chega pelo
merge normal da `develop`.
