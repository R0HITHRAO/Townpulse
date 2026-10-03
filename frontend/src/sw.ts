/**
 * Service Worker Registration for PWA Support
 * ==========================================
 *
 * Owns registration of `/sw.js`. `vite.config.ts` sets `injectRegister: null`
 * (see the comment there), so this is the single registration path — the plugin
 * does not also inject `registerSW.js` into the built HTML.
 *
 * ── Why this checks for updates itself ──────────────────────────────────────
 * A service worker is the one part of a web app that can outlive a deployment.
 * The worker generated for this site used to precache `index.html` and answer
 * every navigation from it, so a visitor's browser kept replaying the shell of
 * an older build — including the content-hashed asset filenames that build
 * referenced. Production therefore kept serving an already-fixed commit for two
 * days, and a plain reload could not break out of it.
 *
 * `vite.config.ts` fixes the worker's own configuration (the shell is no longer
 * precached and `navigateFallback` is disabled). This module covers the other
 * half of the contract: making sure a browser that is *already* running a
 * worker actually notices a new one, and refreshes the page once a new worker
 * takes over — otherwise the tab keeps executing the bundle it loaded earlier.
 *
 * `registration.update()` is a no-op unless the deployed bytes differ, which is
 * exactly the check we want on every load and on a slow interval thereafter.
 */

/** How often to re-check for a new worker while a tab stays open. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  // Replaced at build time. In dev no worker is emitted, so registering would
  // only produce a 404 in the console.
  if (process.env.NODE_ENV !== 'production') return;

  // `controllerchange` fires when a worker takes control of the page. The very
  // first claim is not an update — the page is already showing current bytes —
  // so reloading on it would be a gratuitous flash on every first visit. Track
  // whether we have already been controlled once and only reload after that.
  let hasBeenControlled = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    if (!hasBeenControlled) {
      hasBeenControlled = true;
      return;
    }
    // A newer worker just claimed the page. Everything on screen still comes
    // from the bundle loaded before the update, so start over. The `reloading`
    // flag makes this fire at most once per page, and a fresh page has nothing
    // left to change, so this cannot loop.
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check immediately, then keep checking. Without this a long-lived tab
        // can run a stale build for as long as it stays open.
        void registration.update();
        window.setInterval(() => void registration.update(), UPDATE_INTERVAL_MS);
      })
      .catch((registrationError) => {
        console.warn('TownPulse SW registration failed: ', registrationError);
      });
  });
}
