// Kavach service worker (built by vite-plugin-pwa, strategy "injectManifest").
// Caching mirrors the old generateSW config: precache the app shell, SPA navigation fallback,
// Supabase always network-only. Adds Web Push display + notification taps.
// Updates are user-driven: UpdatePrompt posts {type:'SKIP_WAITING'} after the user taps Reload.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [
      /^\/auth\//,
      /^\/rest\//,
      /^\/realtime\//,
      /^\/functions\//,
      /\/[^/?]+\.[^/]+$/, // anything that looks like a file
    ],
  })
);

// Supabase API/auth/realtime must always hit the network — never serve stale data.
registerRoute(({ url }) => url.hostname.endsWith('supabase.co'), new NetworkOnly());

// ── Web Push ────────────────────────────────────────────────────────────────
// Payload from the `notify` edge function: { title, body, url, tag, urgent }
const DEFAULT_TITLE = 'Kavach';

// Only same-origin app paths may be opened from a notification.
function safePath(url) {
  if (typeof url !== 'string') return '/';
  try {
    const u = new URL(url, self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search : '/';
  } catch {
    return '/';
  }
}

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json() || {};
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const tag = typeof data.tag === 'string' && data.tag ? data.tag : 'kavach';
  const title = typeof data.title === 'string' && data.title ? data.title : DEFAULT_TITLE;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      tag,
      renotify: true, // a newer update for the same alert should still buzz
      requireInteraction: Boolean(data.urgent),
      data: { url: safePath(data.url) },
      icon: '/pwa-192.png',
      badge: '/favicon-32.png',
      vibrate: [300, 150, 300],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data && event.notification.data.url), self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const sameOrigin = windows.filter((c) => new URL(c.url).origin === self.location.origin);
      const exact = sameOrigin.find((c) => c.url === target);
      if (exact) return exact.focus();

      const client = sameOrigin[0];
      if (client) {
        try {
          const focused = await client.focus();
          const navigated = await (focused || client).navigate(target);
          if (navigated) return navigated;
        } catch {
          // uncontrolled or cross-origin window: fall through to a new window
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
