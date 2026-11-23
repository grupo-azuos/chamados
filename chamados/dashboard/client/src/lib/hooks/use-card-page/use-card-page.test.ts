import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import Harness from './use-card-page-harness.test.svelte';
import { CARD_PAGE_SIZE, cardPageCountOf, cardPageOf, type useCardPage } from './use-card-page.svelte';

const items = Array.from({ length: 30 }, (_, index) => index + 1);

describe('the card page', () => {
  // feliz
  it('cuts the list into pages of twelve', () => {
    expect(CARD_PAGE_SIZE).toBe(12);
    expect(cardPageCountOf(30)).toBe(3);
    expect(cardPageOf(items, 2)).toEqual(items.slice(12, 24));
    expect(cardPageOf(items, 3)).toEqual([25, 26, 27, 28, 29, 30]);
  });

  // triste
  it('never shows an empty page, even when asked for one past the end', () => {
    expect(cardPageCountOf(0)).toBe(1);
    expect(cardPageCountOf(5, 0)).toBe(1);
    expect(cardPageOf(items, 9)).toEqual([25, 26, 27, 28, 29, 30]);
    expect(cardPageOf(items, -1)).toEqual(items.slice(0, 12));
  });

  // feliz
  it('changes page and goes back to the last one when a filter shrinks the list', () => {
    let list = items;
    let cards!: ReturnType<typeof useCardPage<number>>;
    render(Harness, { props: { getItems: () => list, onReady: (ready) => (cards = ready) } });

    cards.actions.onPageChange(3);
    flushSync();
    expect(cards.page).toBe(3);
    expect(cards.total).toBe(30);
    expect(cards.items).toHaveLength(6);

    list = items.slice(0, 5);
    expect(cardPageOf(list, cards.page)).toHaveLength(5);
  });
});
