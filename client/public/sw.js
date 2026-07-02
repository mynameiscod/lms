/**
 * Tombstone service worker — self-destructs.
 *
 * The previous SW (cache-first app shell for the telecaller offline console)
 * used a fixed cache name ('crm-v1') that was never bumped between deploys, so
 * devices that installed it kept serving an OLD build indefinitely — the app
 * appeared to "change version depending on the device/network".
 *
 * The telecaller console feature was removed, so there is no longer any reason
 * to run a service worker. This replacement does the opposite of caching: on
 * activation it wipes every cache, unregisters itself, and reloads open tabs so
 * they fetch the current build fresh. A device can only be cleaned by a CHANGED
 * sw.js (the browser fetches it out-of-band and byte-compares) — simply deleting
 * the file would leave stuck devices running their cached copy forever.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {
      /* ignore — best effort */
    }
    try {
      await self.registration.unregister();
    } catch (e) {
      /* ignore */
    }
    // Reload any open tab so it picks up the current build (no SW intercepting).
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    } catch (e) {
      /* ignore — user's next refresh will be clean anyway */
    }
  })());
});

// Never intercept requests — always go straight to the network.
