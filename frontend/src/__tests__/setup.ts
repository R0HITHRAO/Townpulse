import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock Leaflet as it requires DOM canvas APIs not present in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'map-container' }, children),
  TileLayer: () => React.createElement('div', { 'data-testid': 'tile-layer' }),
  Marker: ({ children }: any) => React.createElement('div', { 'data-testid': 'marker' }, children),
  Popup: ({ children }: any) => React.createElement('div', { 'data-testid': 'popup' }, children),
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn(), flyTo: vi.fn() }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));

// jsdom ships no window.matchMedia, but ThemeContext, Reveal, AnimatedBackground
// and SmoothScroll all call it. A plain function (not vi.fn) is deliberate:
// vi.restoreAllMocks() clears implementations of vi.fn() mocks, which used to
// leave a cleared stub behind for async renders leaking across test boundaries.
// configurable: true lets individual tests vi.stubGlobal() their own version.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
