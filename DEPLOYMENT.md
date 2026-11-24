# 🚀 TownPulse Production Deployment Guide

This guide walks you through deploying **TownPulse** so that it is live and globally accessible to anyone on the web.

---

## 🏗️ Architecture in Production

- **Frontend:** Deployed on **Vercel** (Global Edge CDN, automatic SSL, PWA support).
- **Backend:** Deployed on **Render** / **Railway** / **DigitalOcean** (FastAPI Python Web Service).
- **Database:** **Managed PostgreSQL 15 + PostGIS** extension.
- **Cache / OTP Store:** **Managed Redis 7**.

---

## ⚡ Step 1: Deploy Backend & Database to Render (5 Minutes)

1. Sign up / Log in to [Render.com](https://render.com).
2.
Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `https://github.com/R0HITHRAO/Townpulse`.
4. Render will automatically detect [`render.yaml`](./render.yaml) and provision:
   - `townpulse-postgres` (PostgreSQL 15 database)
   - `townpulse-redis` (Redis 7 instance)
   - `townpulse-backend` (FastAPI Web Service)
5.
Click **Apply**.
6. Once the build completes, copy your live backend URL (e.g. `https://townpulse-backend.onrender.com`).

Verify your backend is live:
👉 Visit `https://townpulse-backend.onrender.com/health` (should return `{"status":"ok"}`).

---

## ⚡ Step 2: Deploy Frontend to Vercel (2 Minutes)

1. Sign up / Log in to
[Vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `Townpulse` GitHub repository.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
- `VITE_API_URL` = `https://townpulse-backend.onrender.com` (optional; `frontend/vercel.json` proxies `/api` to this backend when it is left empty)
   - `VITE_GOOGLE_MAPS_API_KEY` = your restricted Maps JavaScript API key (optional; leave empty to use the OpenStreetMap fallback)
6. Click **Deploy**.
For Google Maps, create a browser key in Google Cloud, enable the Maps JavaScript API, enable billing, and restrict the key to TownPulse's production and preview web domains. Never use an unrestricted key. The map remains usable with OpenStreetMap if this variable is not set or Google Maps cannot load.
Vercel will build and assign you a global URL (e.g. `https://townpulse.vercel.app`).

---

## ⚠️ One Vercel project only

This repository is connected to **two** Vercel projects. Only one of them is real:

| Project | Root directory | What it is |
| :--- | :--- | :--- |
| `townpulse` | `frontend` | **The real frontend deployment.** Step 2 above configures this one. |
| `townpulse-lr4y` | `backend` | **Stray — delete it.** It tries to build the FastAPI backend on Vercel, which this project does not support. |

The stray project fails on every push with:

```text
Running "None"
sh: line 1: None: command not found
Error: [BUILD_UTILS_SPAWN_127]
```

Its build command is stored as the literal string `None` in the Vercel project settings — not in any file in this repository, so no code change here can fix it. The backend belongs on Render (Step 1): it needs PostGIS, Redis and long-running requests, and there is no `api/` entrypoint for Vercel's Python runtime.

**To remove it:** Vercel → team `elite-7b73` → project `townpulse-lr4y` → Settings → Delete Project. Until it is deleted, every pull request shows a failing Vercel check even when the site itself deployed successfully.

---

## 🐳 Alternative: Single-Container / VPS Deployment (Docker Compose)

If you are running on your own VPS (DigitalOcean Droplet, AWS EC2, Hetzner, Linode):

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone repository
git clone https://github.com/R0HITHRAO/Townpulse.git
cd Townpulse

# 3. Create .env from template
cp .env.example .env
# Edit .env with your production SECRET_KEY and domains

# 4. Start production stack with Nginx reverse proxy
docker compose -f infra/docker-compose.prod.yml up -d --build

# 5. Run database migrations, then create the admin and owner accounts
docker compose -f infra/docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f infra/docker-compose.prod.yml exec backend python scripts/seed.py
```

`scripts/seed.py` does not seed any listings on its own. It creates the two demo
accounts (`admin@townpulse.dev`, `owner@townpulse.dev`) and imports
`backend/seed/osm_seed.json` only if that file exists — no location data is
bundled. On a fresh deployment step 5 therefore leaves the directory empty;
import one area first with `scripts/import_osm.py`, or build
`seed/osm_seed.json` with `scripts/build_seed_from_osm.py`, then re-run the
seed command. See [README § Data honesty](./README.md#-data-honesty).

---

## 🔑 Default Production Demo Logins

After running `scripts/seed.py`:
- **System Admin:** `admin@townpulse.dev` / `Admin123!`
- **Business Owner:** `owner@townpulse.dev` /
`Owner123!`

*(Make sure to change these passwords after deploying to public production).*