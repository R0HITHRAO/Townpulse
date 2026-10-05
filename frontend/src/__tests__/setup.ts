import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock Leaflet as it requires DOM canvas APIs not present in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'map-container' }, children),
  TileLayer: () => React.createElement('div', { 'data-testid': 'tile-layer' }),
  Marker: ({ children }: any) => React.createElement('div', { 'data-testid': 'marker' }, children),
  Popup: ({ children }: any) => React.createElement('div', { 'data-testid': 'popup' }, children),
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
  }),
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'marker-cluster-group' }, children),
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}));
