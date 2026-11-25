---
name: history-standard
description: O HISTÓRICO PADRÃO do Grupo Azuos — toda escrita do sistema deixa uma linha (quem, quando, o que mudou, antes e depois), e todo sistema tem a tela Histórico, igual em todos. Use SEMPRE que criar ou mudar uma escrita (cadastrar, alterar, arquivar, concluir), quando a pessoa perguntar "quem mudou isso?", pedir auditoria, log de alterações, rastro, ou quiser mexer na tela Histórico.
---

# Histórico padrão

Todo sistema do grupo tem a **tabela de histórico**, a **API** e a **tela Histórico** (última no
menu), exatamente neste padrão — não pode fugir. A checagem de arquitetura (regra
`standard-screens`) reprova o sistema sem a tela, o módulo ou a entrada no menu, e a tabela, a
API e a tela são travadas (`scripts/git/protected-structure.txt`, seção "HISTÓRICO PADRÃO").

## O que o projeto faz

1. **Acrescenta o vocabulário** em `shared/src/schemas/history.schema.ts` — o único arquivo
   livre: a ação (`'pedido.created'`), o tipo do alvo (`'pedido'`) e o rótulo de cada um em
   português.
2. **Grava em toda escrita**, no service, logo depois de gravar:

```ts
await this.history.record({
  actor: user,                 // a identidade da requisição — nunca o corpo
  action: 'pedido.created',
  targetType: 'pedido',
  targetId: row.id,
  targetLabel: row.title,      // o nome que a pessoa VIU
});
```

   Na alteração, use `recordIfChanged` com `diffFields(antes, sóOQueVeio, rótulos)` — campo que
   não veio não entra, e mudança nenhuma não grava linha (o molde é `tasks.service.ts`).
3. **Importa o `HistoryModule`** no módulo da feature.
4. **Testa** que a escrita chama o histórico (molde: `tasks.service.test.ts`).

## Regras

- Falhar no histórico **não desfaz** a escrita principal — vai para o log.
- O histórico só cresce: não há edição nem exclusão de linha.
- Quem lê: toda a equipe ("De todos" / "O que eu fiz").
- Toda linha gravada avisa o dashboard para reler os blocos.
