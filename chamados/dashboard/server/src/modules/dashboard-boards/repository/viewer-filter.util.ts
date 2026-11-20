import {
  type FilterGroup,
  type FilterRule,
  isFilterGroup,
  ME_VALUE,
} from '@template/shared/schemas/dashboard-board.schema';

/** Quem está vendo o bloco — o "eu" de um filtro. */
export type Viewer = { id: string; name: string };

/**
 * O "EU" DO FILTRO VIRA QUEM ESTÁ VENDO — antes de a árvore chegar ao SQL. Só nos campos de
 * pessoa: num campo de texto qualquer, "@me" continua sendo texto. As fontes do chamados guardam
 * o NOME da pessoa (o responsável do chamado, quem fez a manutenção), e é o nome que entra.
 */
export function bindViewer(
  group: FilterGroup,
  personFields: ReadonlySet<string>,
  viewer: Viewer,
): FilterGroup {
  return {
    ...group,
    rules: group.rules.map((node) =>
      isFilterGroup(node) ? bindViewer(node, personFields, viewer) : bindRule(node, personFields, viewer),
    ),
  };
}

function bindRule(rule: FilterRule, personFields: ReadonlySet<string>, viewer: Viewer): FilterRule {
  if (!personFields.has(rule.field)) return rule;
  const swap = (value: string | number) => (value === ME_VALUE ? viewer.name : value);
  if (Array.isArray(rule.value)) return { ...rule, value: rule.value.map(swap) };
  if (typeof rule.value === 'string') return { ...rule, value: swap(rule.value) };

  return rule;
}
