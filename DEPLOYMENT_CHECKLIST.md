# MyTube Deployment Checklist

Track your deployment progress here. Complete items in order.

---

## 🔴 PHASE 1: Railway Backend Setup

### Railway Project Creation
- [ ] Go to [railway.app](https://railway.app) and sign in
- [ ] Click "New Project" → "Deploy from GitHub repo"
- [ ] Select `salmanmuqri/MyTube` repository
- [ ] Keep the project at the repo root so Railway can read `railway.toml`
- [ ] Click "Create" and wait for build to complete

**Status**: ________
**Railway Project ID**: ________________

### Add Database & Cache
- [ ] Add PostgreSQL service
- [ ] Add Redis service
- [ ] Wait for both to finish initializing

### Configure Environment Variables

Copy these into Railway backend **Variables** tab:

**Step-by-step:**
1. Go to Backend service → Variables tab
2. For each variable below, click "Add Variable" and fill in:

```
SECRET_KEY = [GENERATE: python -c "import secrets; print(secrets.token_hex(16))"]
DEBUG = 0
ALLOWED_HOSTS = localhost,127.0.0.1,.up.railway.app
CORS_ALLOWED_ORIGINS = https://mytube-frontend.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES = ^https://.*\.vercel\.app$
CSRF_TRUSTED_ORIGINS = https://mytube-frontend.vercel.app
ENABLE_MEDIA_SERVING = true
```

**Then Railway auto-populates these from Postgres + Redis services:**
```
POSTGRES_DB
POSTGRES_USER  
POSTGRES_PASSWORD
POSTGRES_HOST
POSTGRES_PORT
DATABASE_URL
REDIS_URL
```

- [ ] All variables filled in
- [ ] SECRET_KEY generated and copied
- [ ] Variables saved

**My SECRET_KEY**: ________________

### Deploy Backend
- [ ] Trigger redeploy in Railway
- [ ] Wait for logs to show "Listening on 0.0.0.0:PORT"
- [ ] Note your backend domain: `[DOMAIN].up.railway.app`

**My Backend Domain**: ________________
**Example**: mytube-backend-prod.up.railway.app

### Test Backend Health
- [ ] Run in terminal: `curl https://[YOUR-DOMAIN]/api/health/`
- [ ] Should return: `{"status":"ok"}`

**Test Result**: ✅ / ❌

---

## 🟡 PHASE 2: Vercel Frontend Setup

### Import & Deploy Frontend
- [ ] Go to [vercel.com](https://vercel.com) and sign in with GitHub
- [ ] Click "Add New" → "Project"
- [ ] Find and import `salmanmuqri/MyTube`
- [ ] Keep the project at the repo root so Vercel can use `vercel.json`
- [ ] Click "Deploy" and wait for build
- [ ] Note your Vercel domain: `[NAME].vercel.app`

**My Frontend Domain**: ________________
**Example**: mytube-frontend.vercel.app

### Configure Frontend Environment Variables
1. Go to Vercel project → Settings → Environment Variables
2. Add two variables:

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://[YOUR-BACKEND-DOMAIN]/api` |
| `VITE_MEDIA_BASE_URL` | `https://[YOUR-BACKEND-DOMAIN]/media` |

Example:
```
VITE_API_BASE_URL = https://mytube-backend-prod.up.railway.app/api
VITE_MEDIA_BASE_URL = https://mytube-backend-prod.up.railway.app/media
```

- [ ] Both variables added
- [ ] Vercel shows new deployment triggered

### Redeploy Frontend with Env Vars
- [ ] Click "Redeploy" in Deployments page
- [ ] Wait for build (should take 1-2 min)
- [ ] Should see "Ready" status

**Deployment Status**: ✅ / ❌ / ⏳ Building

---

## 🟢 PHASE 3: Connect Frontend ↔ Backend

### Update Railway with Vercel Domain
**Go back to Railway → Backend service → Variables:**

Update these with your actual Vercel domain:
- `CORS_ALLOWED_ORIGINS` = `https://[YOUR-VERCEL-DOMAIN]`
- `CSRF_TRUSTED_ORIGINS` = `https://[YOUR-VERCEL-DOMAIN]`

- [ ] Variables updated
- [ ] Trigger redeploy on Railway
- [ ] Wait for backend to restart

**Vercel domain used**: ________________

---

## ✅ PHASE 4: Verify Everything Works

**Open your frontend**: https://[YOUR-VERCEL-DOMAIN]

### Functionality Tests
- [ ] Page loads without errors
- [ ] Can see navbar and sidebar
- [ ] Login page accessible at `/login`
- [ ] Can create new account
- [ ] Can log in with created account
- [ ] Homepage shows videos (fetched from backend)
- [ ] Videos have thumbnails (not broken image icons)
- [ ] Click video → player loads
- [ ] Video plays (HLS stream works)
- [ ] Uploader avatars visible
- [ ] Admin panel accessible at `/admin`
- [ ] Can upload videos
- [ ] Uploaded videos appear in "My Videos"

### Browser Console Tests
- [ ] No red errors in F12 → Console tab
- [ ] No CORS warnings
- [ ] No "undefined" warnings
- [ ] Network tab shows API calls to correct backend domain

### Speed Tests
- [ ] Frontend loads in <3 seconds
- [ ] API responses in <1 second
- [ ] Video thumbnails load in <2 seconds
- [ ] HLS stream quality switches smoothly

**Overall Status**: 🟢 Working / 🟡 Partial / 🔴 Broken

---

## 🎉 Deployment Complete!

If all tests pass, you're live in production! 🚀

**Share your app:**
- Frontend: https://[YOUR-VERCEL-DOMAIN]
- Backend API: https://[YOUR-BACKEND-DOMAIN]/api/

### Next Steps (Optional)
- [ ] Set up custom domain for frontend (Vercel → Settings → Domains)
- [ ] Set up custom domain for backend (Railway → Settings → Custom Domain)
- [ ] Configure email for password resets
- [ ] Set up analytics
- [ ] Monitor logs for errors

---

## Support Links

- **Deployment Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Repo**: https://github.com/salmanmuqri/MyTube
