import { useEffect } from 'react';

/**
 * Sets the document title and upserts the meta description for the current
 * route. Keeps share previews and browser history entries meaningful in the
 * SPA where index.html is served for every route.
 */
function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSeo(title: string, description?: string): void {
  useEffect(() => {
    document.title = title;
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:title', title);
      upsertMeta('property', 'og:description', description);
    }
  }, [title, description]);
}

export default useSeo;
