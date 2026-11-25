import { vi } from 'vitest';

import { page } from './state';

export const goto = vi.fn();
export const invalidate = vi.fn();
export const invalidateAll = vi.fn();
export const preloadData = vi.fn();
export const preloadCode = vi.fn();
export const beforeNavigate = vi.fn();
export const afterNavigate = vi.fn();
export const onNavigate = vi.fn();
/* O roteamento raso troca o endereço sem navegar: o `page.url` acompanha, como no SvelteKit. */
export const replaceState = vi.fn((url: string | URL) => {
  page.url = new URL(url, page.url);
});
export const pushState = vi.fn((url: string | URL) => {
  page.url = new URL(url, page.url);
});
