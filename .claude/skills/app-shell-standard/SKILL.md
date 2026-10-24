---
name: app-shell-standard
description: A CASCA PADRÃO (app-shell), a tela "Meu perfil" e as REGRAS DE UI do grupo (card colorido sem borda, nunca select nativo) dos 13 sistemas do Grupo Azuos — barra lateral azul, trilho de ícones, menu de uma ou duas colunas, rodapé com atalhos, Zuzu, perfil e Sair, e no celular a barra de baixo com 3 itens + ☰ e a gaveta. É travada: só os DADOS do menu mudam. Consulte SEMPRE que a pessoa pedir algo sobre menu, barra lateral, sidebar, navegação, "colocar uma tela no menu", ícone do menu, rodapé, perfil, botão de sair, logo, Zuzu, tela de perfil / "Meu perfil", card colorido, borda colorida, faixa colorida, destaque de card, select, dropdown, combobox, layout geral, "barra embaixo no celular", ou quiser mudar, esconder, mover ou criar outro menu/barra.
---

# Casca padrão (app-shell)

A casca é **a mesma, byte a byte, nos 13 sistemas** do Grupo Azuos. Quem abre um sistema e
depois outro tem de encontrar o menu no mesmo lugar, do mesmo jeito. Por isso ela é
**travada**: o hook `.claude/hooks/protect-app-shell.mjs` recusa qualquer mudança na forma, e
o `pre-commit` do git recusa o commit (lista `protected-structure.txt`).

**Tolerância zero:** não existe "só um ajuste" na casca fora do modo admin. Não tente contornar
a trava (outro arquivo, terminal, cópia do componente, CSS por fora) — isso também é bloqueado.

## Como ela é (e não muda)

**Computador** — barra azul à esquerda, recolhível (Ctrl/Cmd+B ou a borda):

- **Uma coluna** (sistema com menos de duas partes): logo em cima, telas com ícone + rótulo;
  no rodapé, de cima para baixo: atalhos → Zuzu debruçado → foto/nome/papel (abre o perfil) →
  Sair. Recolhida, tudo vira ícone com o nome na dica.
- **Duas colunas** (sistema com duas partes ou mais — ex.: Paralegal, Gestão Contábil,
  Chamados): à esquerda o **trilho de ícones** (logo, as partes — a escolhida em amarelo —, e no
  rodapé atalhos, foto e Sair, sempre com dica); à direita o **painel** com o nome da parte e as
  telas dela, rotuladas, e o Zuzu no pé. Recolhida, sobra o trilho, com as telas da parte em
  ícone.

**Celular** — sem barra lateral. Uma barra fixa embaixo com **3 telas + ☰**. O ☰ abre a
**gaveta de baixo** com tudo: as partes, todas as telas, os atalhos, o Zuzu, o perfil e o Sair.

**Meu perfil** — a mesma ficha nos 13: cartão com a faixa da marca, foto, nome, e-mail e papel;
fatos de relance (telefone, cargo, departamento); seções Dados pessoais, Organização, Sistemas e
Preferências (o tema). A ficha vem do admin-console. Nos 12 sistemas ela é SÓ DE LEITURA, com o
botão "Editar no Admin Console"; no admin-console a mesma ficha recebe os formulários e é o
ÚNICO ponto de edição da conta. O que é só de um sistema (no Chamados: módulos, WhatsApp,
equipe, efeitos) entra como seção a mais, depois das padrão. Abre pelo cartão de perfil do
rodapé (`profile: { to: '/profile' }`). Cada sistema só diz DE ONDE vêm os dados, no
`lib/view-models/use-profile.model.ts`.

## O que PODE mudar (sem admin)

Só os **dados** do menu, em `client/src/lib/navigation/navigation.ts`, no objeto `NAVIGATION`:

| Pedido | Onde |
|---|---|
| Tela nova no menu | uma linha em `items` (`key`, `label`, `to`, `icon` do `lucide-react`) |
| Item só para administrador | `isAdminOnly: true` no item |
| Separar o sistema em partes | `areas` + `area` em cada item — com 2 partes, a barra vira duas colunas sozinha |
| Atalho no rodapé (ex.: "Abrir chamado") | uma linha em `actions` (`to` interno ou `href` externo) |
| Para onde o perfil leva | `profile` (sem ele, vai para o perfil do admin-console) |
| Contador vermelho num item | `badges` no `use-app-shell.model.ts` do sistema |
| De onde vem a ficha de "Meu perfil" | `use-profile.model.ts` do sistema (só a origem dos dados) |

No Chamados (Svelte), as listas ficam em `lib/navigation/navigation.ts` por módulo e os
atalhos em `PUBLIC_LINKS`.

## O que NÃO pode (bloqueado)

- Editar os arquivos da casca: `azuos-app-shell*`, `azuos-zuzu`, `azuos-brand-mark`,
  `ui/sidebar`, `ui/sheet`, `ui/tooltip`, `app-shell-navigation.ts`,
  `use-app-shell-navigation.model.ts`, `use-account-session.model.ts`, `account-session.api.ts`,
  `azuos-my-profile-view`, `use-my-profile.model.ts`, `account-profile.api.ts`, a rota do perfil
  (`routes/profile`, `_shell/profile.tsx`, `(app)/profile/+page.svelte`) e, no admin-console,
  `azuos-account-view`.
- Criar outra tela de perfil (pasta `azuos-*profile-view*`, `*profile-card*`).
- Criar outra barra/menu em qualquer arquivo (`<Sidebar…>`, `useSidebar`, `collapsible=`,
  `<nav>` fixo embaixo, pasta `azuos-*sidebar*`, `azuos-*shell*`, `*bottom-nav*`…).
- Tirar a casca da rota raiz (`__root.tsx`, `_shell.tsx`, `+layout.svelte`).
- Pôr componente, cor ou classe no `navigation.ts` — ele é só dado.
- Mudar ordem do rodapé, cores, larguras, tirar o Zuzu, tirar o Sair, esconder o perfil.
- Pelo terminal (`sed -i`, `rm`, `mv`, `>`…), ligar o modo admin ou usar `--no-verify`.

## Regras de UI do grupo (absolutas, nos 13)

**1. Borda colorida é proibida — em card ou em QUALQUER componente.** Faixa na lateral ou no
topo (`border-l-4 border-l-warning`, `border-t-[3px]`), contorno no tom
(`border-destructive/40`), barra colorida feita com fundo (`absolute inset-y-0 left-0 w-1`),
anel colorido de seleção ou halo (`ring-2 ring-primary`), borda que muda de cor no hover ou no
foco: tudo proibido. A cor vem do **fundo**:

| Quero | Use |
|---|---|
| Card colorido, só informação | `AzuosToneCard` com `ui.mode: 'static'` — fundo suave do tom, sem hover |
| Card que reage ao mouse | `AzuosToneCard` com `ui.mode: 'interactive'` — neutro parado; no hover a cor do tom entra por onde o mouse entrou (`hover-fill`, o mesmo do Chamados) |
| Card/filtro selecionado | `state.isSelected` — fundo na cor CHEIA do tom |
| Número de relance | `AzuosStatCard` (fundo suave do tom; selecionado = cor cheia) |
| Campo com erro | fundo vermelho claro (`aria-invalid:bg-destructive-soft`) + a mensagem embaixo |

Fica só: borda **neutra** (`border-border`, `border-input`), o **anel de foco** do teclado
(`focus-visible:ring-*`, acessibilidade) e os **spinners** de carregamento.

**2. Nunca `<select>` nativo.** Sempre o combobox/seletor do projeto (`AzuosSelectField`,
`AzuosComboboxField`, `AzuosOptionPicker`…). Calendário com mês/ano usa a lista própria
(`AzuosCalendarDropdown`), nunca `captionLayout="dropdown"` sozinho.

As duas são checadas na edição (hook) e no CI (`check:design`: `colored-border`,
`native-select`). Pedido de exceção vai para o **suporte**.

## Quando a pessoa pede uma mudança na casca ou no "Meu perfil"

**Regra absoluta, sem exceção:** quem usa o sistema NÃO muda a casca nem a tela "Meu perfil".
Só quem administra muda — e sempre nos 13 sistemas de uma vez.

1. Explique, sem jargão: "O menu e o perfil são os mesmos nos 13 sistemas do grupo, para
   ninguém se perder trocando de sistema. Por isso são travados."
2. Se o pedido cabe nos **dados** (tela nova no menu, parte, atalho, contador, de onde vem a
   ficha), faça por lá.
3. Se não cabe, **não faça, não contorne e não ofereça alternativa caseira**. Mande para o
   **suporte**: "Abra um chamado na Central de Chamados
   (https://chamados.grupoazuos.com.br/support) pedindo a mudança — quem administra decide e
   aplica nos 13 sistemas de uma vez."

## Modo admin (só quem administra)

Quem administra libera a própria máquina, no próprio terminal — o Claude nunca liga sozinho:

```sh
git config azuos.admin true      # no Chamados: git config project.admin true
```

Uma mudança na casca é **atômica**: o mesmo arquivo, igual, nos 13 sistemas, no mesmo dia, a
partir da `main`, indo para `main` e `develop`. Mudar em um sistema só quebra o padrão.
