# Privacidade das métricas

Estado: **governança pendente de revisão pela empresa**. Este documento organiza medidas de
engenharia e decisões necessárias; não declara conformidade com a LGPD nem aprovação da ANPD.

## Finalidade e minimização

A finalidade proposta é acompanhar a construção e a evolução dos sistemas, a participação de
negócio e técnica e as intervenções necessárias. Contagem de commits não representa esforço ou
produtividade e não deve gerar classificação automática de desempenho de funcionários.

O padrão de novos participantes é um ID aleatório opaco (`p-` seguido de 32 caracteres
hexadecimais), papel e ferramentas utilizadas. Nome, e-mail, departamento, conta pessoal no
GitHub e experiência prévia são opcionais. Não perguntar esses dados para liberar um commit.
Um ID existente só é reutilizado quando a pessoa o confirma; compartilhar uma conta GitHub não
comprova ser a mesma pessoa. Para recorrência entre projetos, reutilizar o código confirmado,
sem inferir identidade a partir de nomes parecidos.

Os trailers novos contêm apenas `Participant-Id`, `Participant-Role` e `AI-Tool`. Os dados já
registrados em repositórios privados não são copiados novamente nos trailers. IDs derivados de
nome/e-mail não são pseudônimos adequados: não usar nome, login, MD5 de e-mail ou outro hash
previsível para gerá-los.

## Perfil identificado opcional

A pessoa pode solicitar o registro de nome e/ou e-mail no cadastro. Isso é feito em um commit
próprio de `docs/project.json`, depois de informar o destino e a finalidade. Não repetir esses
campos nos trailers de todas as entregas e não alterar `git config user.*` automaticamente.

Antes de gravar novos dados identificáveis, a empresa precisa registrar controlador, contato,
base legal aplicável e regra de retenção em `privacy`; a governança continua `pending_review`
até essa decisão. A skill não escolhe consentimento ou legítimo interesse sozinha. Um pedido
voluntário de cadastro não é automaticamente consentimento válido para qualquer uso.

O registro opcional usa `profile_disclosure.requested_by_participant`, `notice_version` e
`recorded_at` para documentar o pedido e o aviso apresentado. Esses campos não são assinatura
nem comprovação jurídica automática. O validador compara o cadastro do commit anterior com o
novo para bloquear coleta identificada sem essas condições; dados antigos preservados não são
tratados como novos cadastros na migração de IDs.

Perfis identificados só são permitidos em repositório privado nesta política. A visibilidade
registrada em `privacy.repository_visibility` é uma fotografia, não controle de acesso: antes
de qualquer cadastro, confirmar a configuração real no GitHub. O Git não oferece ACL por arquivo;
se os colaboradores do código não puderem acessar nomes/e-mails, guardar o vínculo em um
cadastro separado com acesso restrito. Não alterar a visibilidade do repositório automaticamente.

## Aviso e decisões da empresa

Antes da coleta identificada, o aviso revisado precisa explicar: quem controla os dados, qual
contato atende os titulares, finalidade, campos opcionais, destinatários, acesso ao repositório,
retenção e forma de exercer direitos. Quem optar por não oferecer nome/e-mail continua podendo
participar com seu ID.

A empresa deve revisar acesso e permissões de GitHub e das ferramentas de IA, compartilhamento,
transferências internacionais e mecanismos aplicáveis, além do tratamento de incidentes. Não
presumir que uma informação já pública no GitHub está liberada para qualquer reutilização.

A política de retenção precisa considerar histórico Git, clones, backups, logs e relatórios.
Apagar uma linha no arquivo atual não apaga versões antigas. Nesta alteração não há reescrita
nem promessa de eliminação retroativa; um eventual pedido deve ser avaliado com a empresa e os
operadores envolvidos.

## Relatórios e publicação

Relatório interno e artigo público têm finalidades e públicos diferentes. A publicação deve
usar agregados e passar por revisão de risco de reidentificação, incluindo departamentos
pequenos, datas e combinações de características. Remover nomes sozinho não garante anonimização.
O vínculo entre IDs, pessoas, autoria Git e sistemas pode continuar permitindo identificação:
o modelo é **pseudonimizado**, não anonimizado.

O processo de relatório deve ter uma lista explícita de campos permitidos e não exportar o
cadastro inteiro. Publicação externa permanece `publication_status: not_authorized` até decisão
específica da empresa. As métricas não incluem as respostas, documentos ou dados pessoais
coletados pelo formulário do Gestão RH.

## Fontes para a revisão

- [LGPD — arts. 5º, 6º, 7º, 9º, 15–18, 33, 37 e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
- [ANPD — tratamento de dados pessoais para estudos e pesquisas](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-tratamento-de-dados-pessoais-para-fins-academicos-e-para-a-realizacao-de-estudos-e-pesquisas).
