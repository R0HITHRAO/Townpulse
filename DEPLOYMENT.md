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
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `https://github.com/R0HITHRAO/Townpulse`.
4. Render will automatically detect [`render.yaml`](./render.yaml) and provision:
   - `townpulse-postgres` (PostgreSQL 15 database)
   - `townpulse-redis` (Redis 7 instance)
   - `townpulse-backend` (FastAPI Web Service)
5. Click **Apply**.
6. Once the build completes, copy your live backend URL (e.g. `https://townpulse-backend.onrender.com`).

Verify your backend is live:
👉 Visit `https://townpulse-backend.onrender.com/health` (should return `{"status":"ok"}`).

---

## ⚡ Step 2: Deploy Frontend to Vercel (2 Minutes)

1. Sign up / Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `Townpulse` GitHub repository.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://townpulse-backend.onrender.com` (your Render backend URL from Step 1)
6. Click **Deploy**.

Vercel will build and assign you a global URL (e.g. `https://townpulse.vercel.app`).

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

# 5. Run database migrations & seed initial town listings
docker compose -f infra/docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f infra/docker-compose.prod.yml exec backend python scripts/seed.py
```

---

## 🔑 Default Production Demo Logins

After database seeding:
- **System Admin:** `admin@townpulse.dev` / `Admin123!`
- **Business Owner:** `owner@townpulse.dev` / `Owner123!`

*(Make sure to change these passwords after deploying to public production).*
