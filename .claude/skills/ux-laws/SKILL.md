---
name: ux-laws
description: As leis de UX que Azuos exige em toda tela — Hick (poucas opções), Fitts (alvos grandes e perto), Jakob (padrões conhecidos), Miller (agrupar em blocos), Von Restorff (um destaque por vez), Conectividade Uniforme (agrupar visualmente o que é relacionado) e Tesler (o sistema absorve a complexidade). Use ao desenhar, criar ou revisar qualquer tela, formulário, menu, lista ou fluxo.
---

# Leis de UX de Azuos

Cada lei abaixo vira **prática obrigatória**. As que têm checagem automática são conferidas
pelo hook de design a cada arquivo editado (`.claude/hooks/design/check-design.mjs`); as outras
dependem de você. Os limites numéricos vêm de `.claude/hooks/design/design.config.json`.

A checagem é estática: ela pega o erro comum (botão de 24px, `<div>` clicável, formulário
de 12 campos soltos), mas **não prova que a tela está boa**. Revise o fluxo com estas leis em
mente mesmo quando o verificador passar.

---

## Lei de Hick

> O tempo para decidir cresce com o número e a complexidade das opções.

**O que exigir**

- Menu principal com no máximo 7 itens; o resto vai para "Mais" ou para a página certa.
- Lista de escolha com mais de 10 opções vira campo com busca (combobox).
- Uma tela, uma tarefa principal. Ações raras ficam em menu secundário.
- Destaque a opção recomendada em vez de apresentar todas com o mesmo peso.

**Limites deste projeto**: Itens no menu = 7 itens; Opções num select = 10 opções; 

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `hick/nav-items` | aviso | Menu com opções demais aumenta o tempo de decisão. |
| `hick/select-options` | aviso | Select com opções demais obriga a ler a lista inteira. |

---

## Lei de Fitts

> O tempo para acertar um alvo depende da distância até ele e do tamanho dele.

**O que exigir**

- Todo alvo de toque ou clique tem pelo menos 40px de altura (botão, item de menu, campo).
- A ação principal fica perto de onde a atenção já está (fim do formulário, canto da barra).
- Ações destrutivas ficam longe das frequentes e pedem confirmação.
- No celular, ações principais ficam ao alcance do polegar, na parte de baixo da tela.

**Limites deste projeto**: Alvo mínimo = 40 px; 

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `fitts/target-size` | erro | Alvo de clique ou toque pequeno demais. |

---

## Lei de Jakob

> As pessoas passam a maior parte do tempo em outros sites e esperam que o seu funcione igual.

**O que exigir**

- Link é <a href>, ação é <button>. Nada de <div> ou <span> clicável.
- Logo no canto superior esquerdo leva para o início; busca e conta ficam no canto direito.
- Todo campo tem rótulo visível ou aria-label; placeholder não é rótulo.
- Ícones consagrados mantêm o sentido de sempre: lixeira exclui, lupa busca.

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `jakob/clickable-non-interactive` | erro | Elemento não interativo com clique: não recebe foco, não responde a teclado e não parece clicável. |
| `jakob/anchor-without-href` | erro | Link sem destino: não abre em nova aba, não aparece para leitor de tela como link. |
| `jakob/placeholder-as-label` | aviso | Campo só com placeholder: o rótulo some ao digitar. |

---

## Lei de Miller

> A memória de trabalho guarda poucos itens (7 ± 2) ao mesmo tempo.

**O que exigir**

- Formulário com mais de 7 campos é dividido em grupos (<fieldset> com <legend>) ou em etapas.
- Números longos aparecem em blocos (CPF, telefone, cartão).
- Listas longas ganham agrupamento, filtro ou paginação.

**Limites deste projeto**: Campos sem agrupar = 7 campos; 

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `miller/ungrouped-fields` | aviso | Formulário longo sem grupos sobrecarrega a memória de trabalho. |

---

## Efeito Von Restorff

> Entre itens parecidos, o que é diferente é o que se lembra.

**O que exigir**

- No máximo 1 ação primária (bg-primary) por tela: o destaque só funciona se for raro.
- A cor de destaque (accent-hero) marca uma coisa por vez: o título, a novidade, o alerta.
- Estado (erro, sucesso) nunca depende só da cor: vem com ícone ou texto.

**Limites deste projeto**: Ações primárias por tela = 1 ações; 

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `von-restorff/single-primary` | aviso | Ação primária demais na mesma tela: quando tudo se destaca, nada se destaca. |

---

## Conectividade Uniforme

> Elementos ligados visualmente (mesmo contorno, mesma linha) são percebidos como um grupo.

**O que exigir**

- Opções do mesmo grupo (radio, checkbox) ficam dentro de <fieldset> ou role="radiogroup"/"group".
- Itens relacionados dividem o mesmo cartão ou a mesma borda; itens sem relação, não.
- As ações de um cartão ficam dentro dele, não soltas embaixo.

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `uniform-connectedness/choice-group` | aviso | Opções do mesmo grupo soltas, sem contorno comum. |

---

## Lei de Tesler

> Toda tarefa tem uma complexidade mínima; ela deve ficar com o sistema, não com quem usa.

**O que exigir**

- Campos de e-mail, telefone, nome e endereço têm type e autocomplete certos: o navegador preenche.
- O sistema deduz o que puder (CEP preenche o endereço, a data padrão é hoje).
- Valores padrão sensatos em vez de campos obrigatórios em branco.

**Checagem automática**

| Regra | Nível | O que pega |
| ----- | ----- | ---------- |
| `tesler/autocomplete` | aviso | Campo comum sem autocomplete: a pessoa digita o que o navegador já sabe. |
| `tesler/input-type` | aviso | Tipo de campo genérico: no celular abre o teclado errado e não valida. |

