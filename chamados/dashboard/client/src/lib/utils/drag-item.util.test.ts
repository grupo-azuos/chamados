import { describe, expect, it } from 'vitest';

import { readDragItem, writeDragItem } from './drag-item.util';

function transfer() {
  const store = new Map<string, string>();

  return {
    dataTransfer: {
      effectAllowed: 'all',
      setData: (format: string, value: string) => void store.set(format, value),
      getData: (format: string) => store.get(format) ?? '',
    },
  };
}

describe('drag item', () => {
  // feliz
  it('carries the id from the dragged card to the drop zone', () => {
    const event = transfer();

    writeDragItem(event, 42);

    expect(readDragItem(event)).toBe(42);
    expect(event.dataTransfer.effectAllowed).toBe('move');
  });

  // triste
  it('ignores a drop that did not come from a card of the screen', () => {
    expect(readDragItem(transfer())).toBeNull();

    const text = transfer();
    text.dataTransfer.setData('text/plain', 'um texto qualquer');
    expect(readDragItem(text)).toBeNull();
  });
});
