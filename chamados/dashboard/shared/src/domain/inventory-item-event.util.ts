export const INVENTORY_ITEM_EVENT_TYPES = [
  'defeito',
  'troca',
  'manutencao',
  'observacao',
  'outro',
] as const;

export type InventoryItemEventType = (typeof INVENTORY_ITEM_EVENT_TYPES)[number];

const EVENT_TYPE_LABELS: Record<InventoryItemEventType, string> = {
  defeito: 'Defeito',
  troca: 'Troca',
  manutencao: 'Manutenção',
  observacao: 'Observação',
  outro: 'Outro',
};

const EVENT_TYPE_TONES: Record<
  InventoryItemEventType,
  'danger' | 'warning' | 'info' | 'neutral' | 'brand'
> = {
  defeito: 'danger',
  troca: 'warning',
  manutencao: 'info',
  observacao: 'neutral',
  outro: 'brand',
};

export function inventoryItemEventTypeLabel(type: InventoryItemEventType): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

export function inventoryItemEventTypeTone(
  type: InventoryItemEventType,
): 'danger' | 'warning' | 'info' | 'neutral' | 'brand' {
  return EVENT_TYPE_TONES[type] ?? 'neutral';
}

export function inventoryItemEventTypeOptions(): {
  value: InventoryItemEventType;
  label: string;
}[] {
  return INVENTORY_ITEM_EVENT_TYPES.map((type) => ({
    value: type,
    label: EVENT_TYPE_LABELS[type],
  }));
}
