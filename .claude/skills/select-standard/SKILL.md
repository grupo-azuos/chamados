---
name: select-standard
description: A REGRA DOS CAMPOS DE ESCOLHA do Grupo Azuos — quando é seletor simples, quando é combobox com busca, quando é a lista com "Cadastrar" e quando é o campo de PESSOA com foto (uma ou várias). Use SEMPRE que a pessoa pedir um campo de escolher ("um select de", "escolher o status", "lista de opções", "responsável", "quem fez", "atribuir a alguém", "dropdown", "combobox", "várias pessoas"), antes de escrever o campo.
---

# Campos de escolha

Todo campo de escolher alguma coisa segue UMA régua. Ela existe para a pessoa que usa o sistema
encontrar o mesmo campo, do mesmo jeito, em toda tela dos 13 sistemas.

## Antes de escrever o campo, pergunte

Pergunte à pessoa, em linguagem simples, só o que você não sabe:

1. **É para escolher uma PESSOA?** ("responsável", "quem fez", "atribuído a", "aprovador")
2. **Dá para escolher mais de uma?**
3. **Quantas opções vai ter?** (mais ou menos — "umas 5", "umas 50", "cresce com o uso")
4. **Quem usa pode cadastrar uma opção nova ali mesmo?** (ex.: "tipo de solicitação" que vai
   crescendo)

## A decisão — nesta ordem

| Situação | Componente | Observação |
|---|---|---|
| Uma **pessoa** | `AzuosPersonPickerField` | Sempre. Foto, busca, e **guarda o id**. Não há outra opção. |
| Várias **pessoas** | `AzuosPersonMultiPickerField` | Sempre. Mesma lista, mesma foto, guarda os ids. |
| Opções que **crescem com o uso** (cadastrar ali mesmo) | `AzuosCreatableComboboxField` (uma) / `AzuosCreatableMultiSelectField` (várias) | O padrão "Cadastrar «termo»" no fim da lista. |
| **Mais de 10** opções | `AzuosComboboxField` (uma) / `AzuosMultiSelectField` (várias) | Com busca: ninguém rola 30 itens procurando. |
| **Até 10** opções | `AzuosSelectField` (uma) / `AzuosMultiSelectField` (várias) | Busca em lista curta é ruído. |

## Pessoa: as regras que não se negociam

- A lista vem de `usePeopleModel()` — quem tem acesso ao sistema no admin-console. Nunca de um
  texto digitado, nunca dos nomes que aparecem nos dados.
- O valor gravado é o **id** da pessoa. Nome muda e se repete; id não.
- Opção com foto montada à mão (`personName:` numa tela) é **recusada** pela checagem de
  arquitetura (regra `person-field`). Use os dois componentes acima.
- Os dois componentes e a lista de pessoas são **protegidos**: só o suporte muda
  (`scripts/git/protected-structure.txt`).
- Enquanto o suporte não liga a integração com o admin-console, a lista traz só quem está
  logado — é o esperado no desenvolvimento.

## Nunca

- `<select>` nativo (regra `native-select`, CI recusa).
- Caixa de texto para pessoa.
- Escolher o componente pelo visual: a régua acima decide, e a borda/balão é a mesma em todos.
