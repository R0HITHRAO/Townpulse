/**
 * Service Worker Registration for PWA Support
 */

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('TownPulse SW registered: ', registration.scope);
        })
        .catch((registrationError) => {
          console.warn('TownPulse SW registration failed: ', registrationError);
        });
    });
  }
}
