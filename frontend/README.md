# TownPulse — Frontend

Modern React 18 + TypeScript + Vite + Tailwind CSS + Leaflet frontend for TownPulse.

## Features

- 🗺️ **Leaflet + OpenStreetMap** interactive map with marker clustering
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

- `VITE_API_URL` — Backend API endpoint (e.g. `http://localhost:8000`)

## Deploying to Vercel

1. Import your GitHub repository into Vercel
2. Set Framework Preset: `Vite`
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Environment Variable: `VITE_API_URL=https://your-backend-api.onrender.com`
