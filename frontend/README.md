# TownPulse — Frontend

Modern React 18 + TypeScript + Vite + Tailwind CSS + Leaflet frontend for TownPulse.

## Features

- 🗺️ **Google Maps or OpenStreetMap** interactive map with selectable locations and listing pins
- 🔍 **Real-time search** with category filter chips and radius slider
- 📱 **Progressive Web App (PWA)** with offline caching of directory & map tiles
- 🌐 **i18n** support (English & Hindi)
- ♿ **WCAG 2.1 AA** compliant focus states, skip link, and keyboard navigation
- 🛡️ **Role-based views** for Public Users, Business Owners, and Administrators

## Local Development

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```

## Environment Variables

- `VITE_API_URL` — Optional backend API endpoint. Leave empty to use the local `/api` proxy or the production Vercel rewrite.
- `VITE_GOOGLE_MAPS_API_KEY` — Optional restricted Maps JavaScript API key. Without it, the map uses OpenStreetMap.

## Deploying to Vercel

1. Import your GitHub repository into Vercel
2. Set Framework Preset: `Vite`
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. The repository's Vercel config forwards `/api/*` to the Render backend. Set `VITE_API_URL` only if using a different backend URL.
7. To use the Google Maps layer, add `VITE_GOOGLE_MAPS_API_KEY` as a restricted browser key and enable the Maps JavaScript API in Google Cloud. Otherwise, the map automatically uses OpenStreetMap.
