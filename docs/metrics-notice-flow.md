# Aviso de privacidade apresentado pelo agente

Versão do texto: `2026-10-19.1`. O texto exibido vem de
`.github/scripts/project-metrics/privacy-notice.mjs`, preenchido com `privacy` de
`docs/project.json`. O hook SessionStart entrega esse texto ao agente como contexto;
isso **não prova que o usuário o viu**. O agente deve publicá-lo na conversa.

## Quando apresentar

No primeiro contato com a pessoa nesta conversa, antes de pedir dados de métricas,
mostre o aviso completo em português, com os valores atuais do projeto. Reapresente
quando mudar a versão, a finalidade ou outra condição material e quando mudar a pessoa
em uma conta compartilhada. Não repita se o mesmo aviso já foi mostrado nesta conversa.
Não basta mandar um link, dizer que o arquivo existe ou imprimir somente no terminal.

Use o texto produzido pelo módulo, sem remover pendências nem chamar o ID de anônimo.
O aviso deve permitir perguntas. Não pedir um aceite obrigatório para liberar trabalho;
ciência não é consentimento. Não preencher um consentimento em nome da pessoa.

## Governança pendente

Enquanto `privacy.governance_status` for `pending_review`, apresente o aviso provisório
e informe as decisões faltantes. Encaminhe-as ao responsável da empresa: controlador,
contato, finalidade, base legal e retenção, acesso e operadores/transferências.
Não iniciar nova coleta por participante, ampliar tratamento ou produzir relatório
individual alegando que o uso de ID resolve a LGPD. Continue ajudando com o código sem
pedir novos dados pessoais para métricas. Não apagar nem reatribuir evidências antigas.
O aviso provisório é transparência sobre a pendência, não substitui aviso final válido.

A empresa deve documentar a hipótese legal adequada. Se considerar legítimo interesse,
registrar finalidade, necessidade, balanceamento e salvaguardas conforme o guia da ANPD.
Não presumir que métricas empresariais são pesquisa por órgão de pesquisa. Uso para
avaliação de desempenho ou divulgação externa exige revisão própria de finalidade e riscos.

## Registro de apresentação

Com a governança aprovada e o participante confirmado, depois de mostrar de fato o aviso,
registre no participante apenas:

```json
{
  "notice_receipt": {
    "notice_version": "2026-10-19.1",
    "presented_at": "<instante real em ISO 8601 UTC>",
    "channel": "agent_chat"
  }
}
```

Não copiar a conversa, nome, e-mail, endereço IP ou assinatura. Esse registro comprova
somente a declaração do agente de que apresentou uma versão; o hook valida o formato,
não verifica a tela ou a leitura. Não criar recibos retroativos ou presumir leitura de
sessões anteriores. Não exigir confirmação de leitura nem criar recibo para pessoas
que não estão nesta sessão. Uma nova versão substitui a fotografia atual; Git preserva
a anterior. Não salvar recibos de participantes enquanto a governança estiver pendente.

Se a pessoa pedir perfil identificado, mostre novamente destino, campos e consequências
do histórico. Espere o pedido específico, registre somente o que ela solicitou em commit
próprio, com `profile_disclosure` e a versão vigente. A recusa não impede trabalho com ID
quando houver condições legais definidas para essas métricas. Não alterar o autor Git.

## Registro do tratamento pela empresa

Antes de aprovar a governança, documentar responsável e canal dos titulares; finalidade e
base legal fundamentada; categorias de dados e participantes; destinatários e acessos;
GitHub/IA e mecanismos de transferência aplicáveis; retenção, exclusão e backups;
medidas de segurança e atendimento a direitos/incidentes. Revisar também os dados já
existentes e sua reutilização. A skill não decide esses fatos pela empresa.

## Referências oficiais

- [LGPD: transparência, bases legais, direitos e segurança](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
- [ANPD: guia de legítimo interesse e teste de balanceamento](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse).
