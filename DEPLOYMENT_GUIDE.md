# MyTube Production Deployment Guide

This guide walks you through deploying MyTube to production using **Vercel** (frontend) and **Railway** (backend + database).

---

## Phase 1: Railway Backend Deployment ⚙️

Railway hosts your Django backend, PostgreSQL database, and Redis cache all in one integrated platform.

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub (or create account)
3. Click **"New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select repository: `salmanmuqri/MyTube`
6. Choose **`backend/` as the root directory** (important!)
7. Click **Create**

Railway will automatically detect `Dockerfile` and `railway.toml` and begin building the backend image.

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ Add Service"**
2. Choose **"Postgres"**
3. Railway will auto-generate credentials; no action needed

### Step 3: Add Redis Cache

1. Click **"+ Add Service"** again
2. Choose **"Redis"**
3. Confirm creation

### Step 4: Configure Backend Environment Variables

In Railway dashboard → Backend service → **Variables**:

Copy-paste each name=value pair:

```env
SECRET_KEY=your-generated-secret-key-here-min-16-chars
DEBUG=0
ALLOWED_HOSTS=localhost,127.0.0.1,.up.railway.app
CORS_ALLOWED_ORIGINS=https://mytube-frontend.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.vercel\.app$
CSRF_TRUSTED_ORIGINS=https://mytube-frontend.vercel.app
ENABLE_MEDIA_SERVING=true

# Database (preferred: single source of truth)
DATABASE_URL=<copy from Railway Postgres Connect tab>

# Optional: only if DATABASE_URL is not set
# POSTGRES_DB=<from Railway>
# POSTGRES_USER=<from Railway>
# POSTGRES_PASSWORD=<from Railway>
# POSTGRES_HOST=<from Railway>
# POSTGRES_PORT=5432

# Redis (auto-filled by Railway from Redis service)
REDIS_URL=<will-be-auto-filled>
```

**How to fill auto-populated values:**
1. Click the **Postgres service** in Railway dashboard
2. Go to **Variables** tab
3. Copy `DATABASE_URL` from the Postgres **Connect** tab and paste it into backend variables
4. Do not manually invent DB username/password; use Railway-provided values only
5. Do the same for Redis service → copy `REDIS_URL`

**For `SECRET_KEY`**: Generate a 16+ character random string:
```bash
python -c "import secrets; print(secrets.token_hex(16))"
```

### Step 5: Deploy Backend

1. Go to **Deploy** tab in Railway
2. Click **"Trigger Deploy"** (or deploy happens automatically on git push)
3. Watch logs; deployment complete when you see: `"Listening on 0.0.0.0:PORT"`

### Step 6: Get Your Backend Domain

1. Go to Backend service → **Settings**
2. Copy the **Domain** (e.g., `mytube-backend-prod.up.railway.app`)
3. **Save this—you'll need it for Vercel setup**

### Step 7: Test Backend Health

Run in terminal:
```bash
curl https://mytube-backend-prod.up.railway.app/api/health/
```

Should return: `{"status":"ok"}` ✅

---

## Phase 2: Vercel Frontend Deployment 🎨

Now deploy your React frontend to Vercel, pointing to your live Railway backend.

### Step 1: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Find and import `salmanmuqri/MyTube`
5. **Important**: Set **Root Directory** to `frontend/`
6. Click **Deploy**

### Step 2: Configure Frontend Environment Variables

In Vercel dashboard → `frontend` project → **Settings** → **Environment Variables**:

Add these two variables:

| Name | Value | Example |
|------|-------|---------|
| `VITE_API_BASE_URL` | Your Railway backend domain + /api | `https://mytube-backend-prod.up.railway.app/api` |
| `VITE_MEDIA_BASE_URL` | Your Railway backend domain + /media | `https://mytube-backend-prod.up.railway.app/media` |

Replace `mytube-backend-prod.up.railway.app` with your actual Railway domain from Step 6 above.

### Step 3: Redeploy Frontend

1. After adding environment variables, click **"Redeploy"** on the Deployments page
2. Wait for build to complete
3. Vercel assigns you a domain like `mytube-frontend.vercel.app` — **save this**

### Step 4: Update Railway with Vercel Domain

Go back to **Railway dashboard** → Backend service → **Variables**:

Update these variables with your actual Vercel domain:
- `CORS_ALLOWED_ORIGINS=https://mytube-frontend.vercel.app`
- `CSRF_TRUSTED_ORIGINS=https://mytube-frontend.vercel.app`

Then **trigger a redeploy** on Railway.

### Step 5: Test the Full App

Open your Vercel frontend URL: `https://mytube-frontend.vercel.app`

**Test checklist:**
- [ ] Page loads without errors
- [ ] Login page is accessible (`/login`)
- [ ] Can create a new account
- [ ] Can upload videos
- [ ] Homepage displays videos (fetch from backend)
- [ ] Video player loads and plays HLS stream
- [ ] Thumbnails and avatars load from backend
- [ ] Admin panel is accessible

---

## Phase 3: Custom Domain (Optional) 🌐

If you want to use your own domain (e.g., `mytube.com`):

### For Frontend (Vercel)
1. Vercel dashboard → **Settings** → **Domains**
2. Add your domain and follow DNS setup instructions

### For Backend (Railway)
1. Railway → Backend service → **Settings** → **Custom Domain**
2. Add your domain; follow DNS setup instructions

---

## Troubleshooting

### Check Backend Logs
```
Railway dashboard → Backend service → Logs tab
```
Look for errors like "ModuleNotFoundError", database connection issues, or missing env vars.

### Check Frontend Logs
```
Vercel dashboard → Deployments → Logs tab → Function logs
```
Look for "VITE_API_BASE_URL undefined" or CORS errors in browser console.

### Test CORS
Open browser console (F12) and run:
```javascript
fetch('https://your-railway-domain/api/users/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: 'test@test.com', password: 'test'})
})
.then(r => r.json())
.then(console.log)
```

Should NOT have CORS errors; should get 401 (bad credentials) or 200 (success).

### Test Media Loading
In browser, check Network tab → filter by `media/`. All media requests should:
- URL: `https://your-railway-domain/media/...` ✅
- Status: 200 ✅
- Not from Vercel ❌

---

## Summary

| Service | Purpose | Platform | Domain |
|---------|---------|----------|--------|
| Backend | Django API + Video Processing | Railway | mytube-backend-prod.up.railway.app |
| Database | PostgreSQL (auto-created) | Railway | (internal to Railway) |
| Cache | Redis (auto-created) | Railway | (internal to Railway) |
| Frontend | React SPA | Vercel | mytube-frontend.vercel.app |

---

## Need Help?

- **Railway docs**: https://docs.railway.app
- **Vercel docs**: https://vercel.com/docs
- **Django on Railway**: https://docs.railway.app/guides/django
- **React on Vercel**: https://vercel.com/docs/frameworks/nextjs (framework-agnostic applies)

**You're all set to deploy! 🚀**
