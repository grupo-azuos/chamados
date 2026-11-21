import { ALERT_METRIC_LABELS } from '@template/shared/domain/computer-alert.util';
import { HEALTH_STATUS_LABELS } from '@template/shared/domain/computer-health.util';
import { COMPUTER_KIND_LABELS } from '@template/shared/domain/computer-kind.util';
import { INVENTORY_CATEGORY_LABELS } from '@template/shared/domain/inventory-catalog.util';
import { DISPOSAL_REASON_LABELS, STOCK_MOVEMENT_TYPE_LABELS } from '@template/shared/domain/inventory-stock.util';
import { QUOTE_KIND_LABELS, QUOTE_STATUS_LABELS } from '@template/shared/domain/maintenance-quote.util';
import { MAINTENANCE_TYPE_LABELS } from '@template/shared/domain/maintenance.util';
import { MOVEMENT_TYPE_LABELS } from '@template/shared/domain/part-catalog.util';
import {
  SCHEDULE_EVENT_CATEGORY_LABELS,
  SCHEDULE_EVENT_KIND_LABELS,
  SOFTWARE_PROJECT_STATUS_LABELS,
  TIMELINE_EVENT_TYPE_LABELS,
} from '@template/shared/domain/software-project.util';
import { TICKET_PRIORITIES, TICKET_STATUS_LABELS, ticketPriorityLabel } from '@template/shared/domain/ticket-status.util';
import {
  type DataField,
  type DataFieldType,
  type DataSourceKey,
  fieldsOf,
  type FilterGroup,
  type FilterRule,
  isFilterGroup,
  MAX_FILTER_DEPTH,
  ME_VALUE,
} from '@template/shared/schemas/dashboard-board.schema';

/**
 * O MONTADOR DE FILTRO — que operadores cada campo aceita, como cada valor se escreve e como a
 * árvore "E/OU" muda. Funções puras; o diálogo só desenha. O servidor confere tudo de novo: o
 * campo precisa existir na fonte e o operador é de uma lista fechada.
 */
export const OPERATOR_LABELS: Record<FilterRule['operator'], string> = {
  '=': 'é',
  '!=': 'não é',
  in: 'é um destes',
  notIn: 'não é nenhum destes',
  contains: 'contém',
  doesNotContain: 'não contém',
  beginsWith: 'começa com',
  '<': 'antes de',
  '<=': 'até',
  '>': 'depois de',
  '>=': 'a partir de',
  between: 'entre',
  null: 'está vazio',
  notNull: 'está preenchido',
};

const OPERATORS_BY_TYPE: Record<DataFieldType, FilterRule['operator'][]> = {
  enum: ['=', '!=', 'in', 'notIn', 'null', 'notNull'],
  text: ['=', '!=', 'contains', 'doesNotContain', 'beginsWith', 'null', 'notNull'],
  date: ['=', '<', '<=', '>', '>=', 'between', 'null', 'notNull'],
  boolean: ['='],
};

export function operatorsFor(field: Pick<DataField, 'type'>): FilterRule['operator'][] {
  return OPERATORS_BY_TYPE[field.type];
}

/** Os operadores que não pedem valor. */
export function needsValue(operator: FilterRule['operator']): boolean {
  return operator !== 'null' && operator !== 'notNull';
}

export function isListOperator(operator: FilterRule['operator']): boolean {
  return operator === 'in' || operator === 'notIn';
}

/** O rótulo de cada opção de um campo de lista — o mesmo nome que a tela mostra no resto do sistema. */
const ENUM_LABELS: Record<string, string> = {
  ...(TICKET_STATUS_LABELS as Record<string, string>),
  ...Object.fromEntries(TICKET_PRIORITIES.map((priority) => [priority, ticketPriorityLabel(priority)])),
  ...COMPUTER_KIND_LABELS,
  ...HEALTH_STATUS_LABELS,
  ...ALERT_METRIC_LABELS,
  ...MAINTENANCE_TYPE_LABELS,
  ...MOVEMENT_TYPE_LABELS,
  ...SOFTWARE_PROJECT_STATUS_LABELS,
  ...TIMELINE_EVENT_TYPE_LABELS,
  ...SCHEDULE_EVENT_CATEGORY_LABELS,
  ...SCHEDULE_EVENT_KIND_LABELS,
  ...INVENTORY_CATEGORY_LABELS,
  ...STOCK_MOVEMENT_TYPE_LABELS,
  ...DISPOSAL_REASON_LABELS,
  ...QUOTE_STATUS_LABELS,
  ...QUOTE_KIND_LABELS,
};

export function enumOptionsOf(field: DataField): { value: string; label: string }[] {
  return (field.options ?? []).map((value) => ({ value, label: ENUM_LABELS[value] ?? value }));
}

/** As datas relativas que o filtro oferece — o filtro salvo continua certo amanhã. */
export const RELATIVE_DAY_OPTIONS = [
  { value: '@today', label: 'Hoje' },
  { value: '@today-7', label: 'Hoje − 7 dias' },
  { value: '@today-30', label: 'Hoje − 30 dias' },
  { value: '@today+7', label: 'Hoje + 7 dias' },
  { value: '@weekStart', label: 'Início da semana' },
  { value: '@monthStart', label: 'Início do mês' },
];

/** Uma condição nova: o primeiro campo da fonte, com o primeiro operador dele. */
export function emptyRule(source: DataSourceKey, id = ruleId()): FilterRule {
  const [field, definition] = Object.entries(fieldsOf(source))[0]!;

  return { id, field, operator: operatorsFor(definition)[0]!, value: defaultValueOf(definition) };
}

export function emptyGroup(id = ruleId()): FilterGroup {
  return { id, combinator: 'and', rules: [] };
}

function defaultValueOf(field: DataField): FilterRule['value'] {
  if (field.type === 'boolean') return true;
  if (field.type === 'enum') return field.options?.[0] ?? '';
  if (field.type === 'date') return '@today';

  return field.isPerson ? ME_VALUE : '';
}

/** Trocar o campo recomeça o operador e o valor: o "contém" de um texto não vale numa data. */
export function withField(source: DataSourceKey, rule: FilterRule, field: string): FilterRule {
  const definition = fieldsOf(source)[field];
  if (!definition) return rule;

  return { ...rule, field, operator: operatorsFor(definition)[0]!, value: defaultValueOf(definition) };
}

/** Trocar o operador acerta o valor: lista vira lista, "entre" vira duas pontas, vazio some. */
export function withOperator(rule: FilterRule, operator: FilterRule['operator']): FilterRule {
  if (!needsValue(operator)) return { ...rule, operator, value: null };
  if (isListOperator(operator)) return { ...rule, operator, value: Array.isArray(rule.value) ? rule.value : [] };
  if (operator === 'between') return { ...rule, operator, value: ['@monthStart', '@today'] };
  const single = Array.isArray(rule.value) ? (rule.value[0] ?? '') : rule.value;

  return { ...rule, operator, value: single ?? '' };
}

/** A árvore com um nó trocado, achado pelo id em qualquer nível. */
export function replaceNode(group: FilterGroup, id: string, next: FilterRule | FilterGroup | null): FilterGroup {
  const rules = group.rules.flatMap((node) => {
    if (node.id === id) return next ? [next] : [];

    return [isFilterGroup(node) ? replaceNode(node, id, next) : node];
  });

  return { ...group, rules };
}

/** Pode pôr um grupo dentro deste? Até o teto de níveis do contrato. */
export function canNest(depth: number): boolean {
  return depth < MAX_FILTER_DEPTH;
}

/** "Hoje − 7 dias" ou "15/11/2026" — o valor de data como se lê. */
export function dayValueLabel(value: string): string {
  const relative = RELATIVE_DAY_OPTIONS.find((option) => option.value === value);
  if (relative) return relative.label;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function ruleId(): string {
  return `r-${Math.random().toString(36).slice(2, 10)}`;
}

/** Toda condição e todo grupo com id — o montador acha cada nó por ele. */
export function withIds(group: FilterGroup): FilterGroup {
  return {
    ...group,
    id: group.id ?? ruleId(),
    rules: group.rules.map((node) => (isFilterGroup(node) ? withIds(node) : { ...node, id: node.id ?? ruleId() })),
  };
}
