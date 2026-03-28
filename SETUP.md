# MyTube — Step-by-Step Setup Guide

This guide answers **"what do I do now?"** for every supported deployment path.
Pick the option that matches your situation, follow the steps in order, then use
the [First-time verification](#first-time-verification) section to confirm
everything is working.

---

## Choose Your Deployment Option

| Option | Best for | What you need |
|--------|----------|---------------|
| [A — Docker Compose](#option-a-docker-compose-local--vps) | Local development or a VPS/server you control | Docker Engine 24 + Docker Compose v2 |
| [B — Railway (all-in-one)](#option-b-railway-all-in-one-cloud) | Zero-server cloud hosting | Free Railway account |
| [C — Vercel + Railway (split)](#option-c-vercel-frontend--railway-backend) | Production-grade split with free Vercel CDN | Railway + Vercel accounts |

---

## Option A — Docker Compose (Local / VPS)

### What you need
- **Docker Engine 24+** and **Docker Compose v2**
  - macOS / Windows: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - Linux: `sudo apt install docker.io docker-compose-plugin` (Ubuntu/Debian)
- The MyTube source code on your machine

### Step 1 — Get the code

```bash
git clone https://github.com/<your-fork>/MyTube.git mytube
cd mytube
```

### Step 2 — Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and set **at minimum** these three values:

```dotenv
# Generate a real key:  openssl rand -base64 50
SECRET_KEY=<paste-generated-key-here>

# Choose any strong password
POSTGRES_PASSWORD=choose_a_strong_password_here

# Your hostname(s) — comma-separated, no spaces
# Local:  localhost,127.0.0.1
# VPS:    add your server's public IP or domain, e.g. 1.2.3.4,mysite.com
ALLOWED_HOSTS=localhost,127.0.0.1
```

Leave everything else at its default for a local install. On a VPS you should
also set:

```dotenv
CORS_ALLOWED_ORIGINS=http://<your-domain-or-ip>
CORS_ALLOW_ALL_ORIGINS=false
```

### Step 3 — Start all services

```bash
docker compose up -d
```

This one command:
1. Pulls PostgreSQL 16 and Redis 7 images
2. Builds the Django backend image (installs FFmpeg, Python packages)
3. Builds the React frontend image (runs `npm run build`)
4. Runs database migrations
5. Seeds 20 video categories + default admin/demo accounts
6. Starts Gunicorn, Celery worker, Celery beat, and Nginx

The first build takes 3–8 minutes depending on your internet connection.
Subsequent starts are instant.

### Step 4 — Verify services are up

```bash
docker compose ps
```

All six services (`postgres`, `redis`, `backend`, `celery_worker`,
`celery_beat`, `frontend`, `nginx`) should show `running` or `Up`.

```bash
# Tail live logs from all containers
docker compose logs -f

# Backend logs only
docker compose logs backend --tail=50

# Celery worker logs only
docker compose logs celery_worker --tail=50
```

### Step 5 — Open the app

| URL | What you see |
|-----|-------------|
| `http://localhost` | MyTube home page |
| `http://localhost/admin/` | Django built-in admin |
| `http://localhost/api/health/` | `{"status": "ok"}` — backend health check |

> **On a VPS**, replace `localhost` with your server's IP or domain.

---

## Option B — Railway (All-in-One Cloud)

### What you need
- [Railway account](https://railway.app) (free tier is enough to start)
- The MyTube repository pushed to your own GitHub account

### Step 1 — Fork the repository

Go to `https://github.com/salmanmuqri/MyTube` and click **Fork**.
This puts a copy under your own account so Railway can deploy it.

### Step 2 — Create a new Railway project

1. Log in at [railway.app](https://railway.app)
2. Click **New Project → Deploy from GitHub repo**
3. Select your forked `MyTube` repository
4. Railway detects `railway.toml` and uses it automatically

### Step 3 — Add PostgreSQL

1. In your Railway project, click **+ New → Database → Add PostgreSQL**
2. Click the PostgreSQL service → **Connect** tab
3. Copy the values:
   - `POSTGRES_HOST`
   - `POSTGRES_PORT`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DB`

### Step 4 — Add Redis

1. Click **+ New → Database → Add Redis**
2. Click the Redis service → **Connect** tab
3. Copy the full **Redis URL** (starts with `redis://...`)

### Step 5 — Set environment variables on the backend service

Click your **MyTube backend service → Variables** and add:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Run `openssl rand -base64 50` locally and paste the output |
| `DEBUG` | `0` |
| `POSTGRES_DB` | from step 3 |
| `POSTGRES_USER` | from step 3 |
| `POSTGRES_PASSWORD` | from step 3 |
| `POSTGRES_HOST` | from step 3 |
| `POSTGRES_PORT` | from step 3 |
| `REDIS_URL` | full Redis URL from step 4 |
| `ALLOWED_HOSTS` | `<your-railway-backend-domain>,localhost` |
| `CORS_ALLOW_ALL_ORIGINS` | `true` *(change to `false` once frontend URL is known)* |

Railway auto-injects `PORT`. The `railway.toml` `startCommand` handles
migrations, static files, seed data, and Gunicorn automatically.

### Step 6 — Deploy

Click **Deploy** (or push a commit to your fork). Railway will build the Docker
image and run the start command. Watch the **Deploy Logs** tab.

A successful deploy ends with a line like:
```
[INFO] Booting worker with pid: N
```

### Step 7 — Open the app

Click **Settings → Domains** in your Railway service to find the public URL
(e.g. `https://mytube-backend-xxxx.up.railway.app`).

Append `/api/health/` — you should see `{"status": "ok"}`.

> **Note:** Railway's free tier only deploys the backend service.
> For a full UI, continue to [Option C](#option-c-vercel-frontend--railway-backend)
> or use Option A for a fully self-hosted setup.

---

## Option C — Vercel (Frontend) + Railway (Backend)

This is the recommended production split: static React app on Vercel CDN,
Django API + database on Railway.

### Step 1 — Set up the Railway backend

Follow **Option B steps 1–6** above.

After deploying, note your Railway backend's public URL, e.g.
`https://mytube-backend-xxxx.up.railway.app`

### Step 2 — Update CORS on Railway

In your Railway backend service → Variables, update:

```
CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app
CORS_ALLOW_ALL_ORIGINS=false
```

(You may need to come back and fill in the Vercel URL after Step 4.)

### Step 3 — Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your forked `MyTube` repository
3. Vercel detects `vercel.json` automatically — no extra config needed
4. **Before clicking Deploy**, add one Environment Variable:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://<your-railway-backend-domain>/api` |

5. Click **Deploy**

Vercel runs `cd frontend && npm install && npm run build` and publishes the
`frontend/dist` folder.

### Step 4 — Update `ALLOWED_HOSTS` on Railway

Add your Vercel domain to the Railway backend:

```
ALLOWED_HOSTS=<your-railway-backend-domain>,<your-vercel-domain>
```

Redeploy the Railway service for the change to take effect.

### Step 5 — Open the app

Visit your Vercel URL (e.g. `https://mytube-xxxx.vercel.app`).
The frontend will call the Railway backend at the `VITE_API_BASE_URL` you set.

---

## First-Time Verification

After any deployment option, run through this checklist:

### ✅ 1. Home page loads

Open the app URL. You should see the MyTube home page with a category filter
bar across the top. If it shows "No videos found" that is normal — no videos
have been uploaded yet.

### ✅ 2. Login with the default admin account

- Click **Sign In**
- Email: `admin@mytube.com`
- Password: `admin123`

You should be redirected to the home page and see "admin" in the top-right corner.

> **Important:** Change this password immediately on any public deployment.
> Go to **Profile → Edit** or use the Django admin at `/admin/`.

### ✅ 3. Login with the demo account

Sign out, then sign in with:
- Email: `demo@mytube.com`
- Password: `demo123`

### ✅ 4. Register a new account

Sign out, go to **Sign Up**, and create a fresh account.

### ✅ 5. Upload a video

Log in as any user, click **Upload**, fill in a title, and choose a small test
video. After upload the status shows `PROCESSING`. Wait ~30 seconds (short
clip) then refresh — the video should become `READY` and appear on the home page.

### ✅ 6. Check the backend health endpoint

Visit `<your-url>/api/health/` — expected response: `{"status": "ok"}`

### ✅ 7. (Optional) Check the Django admin

Visit `<your-url>/admin/` and log in with `admin@mytube.com` / `admin123`.
You can manage users, videos, and categories here.

---

## Day-to-Day Operations

### Docker Compose

```bash
# Start (or restart after code changes)
docker compose up -d

# Stop (keeps all data)
docker compose down

# Stop AND wipe all data (fresh start)
docker compose down -v

# View live logs
docker compose logs -f

# View logs for one service
docker compose logs backend --tail=100

# Rebuild after code changes
docker compose up -d --build

# Run a one-off Django command
docker compose exec backend python manage.py <command>

# Open a Django shell
docker compose exec backend python manage.py shell

# Check service status
docker compose ps
```

### Promote a user to admin

```bash
# Docker
docker compose exec backend python manage.py shell -c "
from users.models import User
u = User.objects.get(email='someone@example.com')
u.is_staff = True
u.role = 'ADMIN'
u.save()
print('Done')
"

# Railway (run in Railway shell / CLI)
python manage.py shell -c "
from users.models import User
u = User.objects.get(email='someone@example.com')
u.is_staff = True; u.role = 'ADMIN'; u.save()
"
```

### Change the default admin password

```bash
# Docker
docker compose exec backend python manage.py changepassword admin
```

Or log in to `/admin/` → Users → find `admin` → change password there.

---

## Troubleshooting

### "No videos found" on home page

This is expected on a brand-new install — no one has uploaded a video yet.
Categories and accounts are seeded automatically; actual video content is not.

### Can't log in with admin@mytube.com

1. Check that the backend started cleanly:
   ```bash
   docker compose logs backend --tail=100
   ```
2. Look for a line containing `seed_data` — it should say
   `✅ Superuser created: admin@mytube.com / admin123`
3. If you see a database connection error, make sure `POSTGRES_PASSWORD` in
   `.env` matches the password the postgres container was first started with.
   If in doubt, reset with: `docker compose down -v && docker compose up -d`

### API calls return 401 Unauthorized

Your JWT access token has expired (they last 60 minutes). Sign out and sign
back in to get a fresh token. This happens automatically in most cases via the
token-refresh interceptor.

### Videos stuck in PROCESSING

```bash
docker compose logs celery_worker --tail=200
```

Common causes:
- Celery worker is not running (check `docker compose ps`)
- FFmpeg failed (look for `FFmpeg failed` in the logs)
- Not enough disk space for the HLS segments

### Frontend can't reach the API (Network Error / CORS)

- **Docker**: make sure `CORS_ALLOW_ALL_ORIGINS=true` is set in `.env`
  (the default) while developing locally.
- **Vercel + Railway**: make sure `CORS_ALLOWED_ORIGINS` in Railway contains
  your exact Vercel URL (no trailing slash), and `VITE_API_BASE_URL` in Vercel
  contains your full Railway backend URL ending in `/api`.

### Port 80 already in use (Docker)

Change the exposed port in `.env`:
```dotenv
HTTP_PORT=8080
```
Then restart: `docker compose up -d`

### Forgot the admin password

```bash
docker compose exec backend python manage.py changepassword admin
```

---

## Default Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin / Superuser | `admin@mytube.com` | `admin123` | Change before going public |
| Demo User | `demo@mytube.com` | `demo123` | Safe for testing |

Both accounts are created automatically on first startup by `seed_data`.
