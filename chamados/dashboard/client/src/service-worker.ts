/// <reference lib="webworker" />

import { version } from '$service-worker';

import { networkOrOffline } from './lib/utils/network-or-offline.util';

const worker = self as unknown as ServiceWorkerGlobalScope;
const cachePrefix = 'azuos-dashboard-offline-';
const cacheName = `${cachePrefix}${version}`;
const offlineUrl = new URL('offline.html', worker.registration.scope).href;

worker.addEventListener('install', (event) => {
  event.waitUntil(prepareOfflinePage());
});

async function prepareOfflinePage(): Promise<void> {
  const response = await fetch(offlineUrl, { credentials: 'same-origin', cache: 'reload' });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Could not load the offline page');
  }

  const cache = await caches.open(cacheName);
  await cache.put(offlineUrl, response);
  await worker.skipWaiting();
}

worker.addEventListener('activate', (event) => {
  event.waitUntil(removeOldOfflinePages());
});

async function removeOldOfflinePages(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)),
  );
  await worker.clients.claim();
}

worker.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== worker.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  // Só a página estática de indisponibilidade entra no cache. API, HTML autenticado,
  // cookies e redirecionamentos de login continuam sempre sob controle do servidor.
  event.respondWith(
    networkOrOffline(request, async () => {
      const cache = await caches.open(cacheName);
      return cache.match(offlineUrl);
    }),
  );
});
