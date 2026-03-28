# MyTube

A production-ready, self-hosted intelligent video streaming platform built with Django + React. Upload, process, and stream HD videos with adaptive bitrate (HLS), ML-powered recommendations, full-text search, and a complete admin panel — no cloud dependencies required.

> **👉 New here?** See [SETUP.md](SETUP.md) for a step-by-step guide covering Docker, Railway, and Vercel deployments, first-login verification, and troubleshooting.

---

## Features

- **Adaptive Bitrate Streaming** — Videos are automatically transcoded to multiple resolutions (1080p, 720p, 480p, 360p) using FFmpeg and served via HLS (`.m3u8`). Quality adjusts automatically or can be selected manually.
- **YouTube-like Video Player** — Custom player built on `hls.js` with seek-preview tooltips, buffered-progress display, quality selector, playback speed (0.25× – 2×), Picture-in-Picture, Theater mode, full keyboard shortcuts, and animated center-icon feedback.
- **ML Recommendation Engine** — Content-based TF-IDF cosine similarity for "Similar videos" + collaborative watch-history filtering for "For You" feed. Model retrains nightly via Celery Beat.
- **Trending Algorithm** — Weighted score combining views, likes, recency and watch-duration. Recalculates hourly.
- **Full-Text Search & Filtering** — Search by title/description/tags, filter by category, sort by views/likes/newest.
- **User System** — Email-based auth with JWT (access + refresh + cookie), channel profiles with avatar/banner, subscriber counts.
- **Comments** — Nested comments with delete (owner + admin).
- **Watch History & Analytics** — Tracks per-session progress. Resume-watching support. User stats dashboard.
- **Admin Panel (React UI)** — Dashboard with stats, user management (ban/promote), video moderation, category CRUD, manual trigger buttons for trending recalc and ML retrain.
- **Django Admin** — Full Django admin at `/admin/` also registered.
- **Docker Compose** — One-command deployment with PostgreSQL, Redis, Celery worker, Celery beat, Nginx reverse proxy.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Video Playback | hls.js (custom player) |
| Backend | Django 6, Django REST Framework, Simple JWT |
| Task Queue | Celery 5 + Redis 7 |
| Scheduler | Celery Beat (`django_celery_beat`) |
| Database | PostgreSQL 16 (Docker) / SQLite (local dev) |
| Video Processing | FFmpeg (transcoding + HLS + thumbnails) |
| ML | scikit-learn TF-IDF + cosine similarity |
| Web Server | Nginx (reverse proxy + static/media serving) |
| Containerization | Docker + Docker Compose |

---

## Quick Start — Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+ (`nvm use 20`)
- FFmpeg (`brew install ffmpeg` / `sudo apt install ffmpeg`)

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data        # Seeds categories + demo superuser
python manage.py runserver
```

Backend API: http://localhost:8000

### 2. Frontend

```bash
cd frontend
nvm use 20          # Node 20 required for Tailwind CSS v4
npm install
npm run dev
```

Frontend: http://localhost:5173

### Default Credentials

| Role | Email | Username | Password |
|---|---|---|---|
| Superuser / Admin | admin@mytube.com | admin | admin123 |
| Demo User | demo@mytube.com | demo | demo123 |

> **Change these before any public deployment.**

---

## Quick Start — Docker (Recommended for production)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

### Steps

```bash
# 1. Clone and enter the project
git clone <your-repo-url> mytube && cd mytube

# 2. Create your .env from the example
cp .env.example .env
# Edit .env — set SECRET_KEY, POSTGRES_PASSWORD, ALLOWED_HOSTS at minimum

# 3. Start all services
docker compose up -d
# Categories and default accounts are seeded automatically on first start.
# Default credentials — change before any public deployment:
#   Admin: admin@mytube.com / admin123
#   Demo:  demo@mytube.com  / demo123
```

App: http://localhost (port 80 by default; change `HTTP_PORT` in `.env`)

### Services started by Docker Compose

| Service | Description |
|---|---|
| `postgres` | PostgreSQL 16 database |
| `redis` | Redis 7 (cache + Celery broker) |
| `backend` | Django + Gunicorn (4 workers) |
| `celery_worker` | Processes video transcoding tasks |
| `celery_beat` | Runs scheduled tasks (trending hourly, retrain nightly) |
| `frontend` | React app built and served via Nginx |
| `nginx` | Reverse proxy — routes `/api/*` → backend, `/media/*` → files, `/` → frontend |

---

## Project Structure

```
zMyTube/
├── backend/
│   ├── core/           # Django project settings, URLs, Celery config, Admin API views
│   ├── users/          # Custom User model (UUID PK, email auth), subscriptions
│   ├── videos/         # Video upload, processing (FFmpeg/HLS), comments, likes, trending
│   ├── recommendations/# ML recommendation engine (TF-IDF + collaborative filtering)
│   ├── analytics_app/  # Watch events, progress tracking, user stats
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/      # HomePage, WatchPage, UploadPage, AdminPage, ProfilePage…
│   │   ├── components/ # Navbar, VideoPlayer, VideoCard, CommentSection…
│   │   ├── api/        # axios instance + services.js
│   │   └── context/    # AuthContext
│   ├── Dockerfile
│   └── vite.config.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── PROJECT_DOCUMENTATION.md
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | — | Django secret key (generate with `openssl rand -base64 50`) |
| `DEBUG` | `0` | Set `1` for local dev only |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hostnames |
| `POSTGRES_DB` | `mytube` | Database name |
| `POSTGRES_USER` | `mytube` | Database user |
| `POSTGRES_PASSWORD` | — | **Must be set** |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` | Comma-separated origins |
| `HTTP_PORT` | `80` | Port exposed by Nginx |
| `VITE_API_BASE_URL` | `/api` | API base for frontend build |

---

## API Reference

All endpoints prefixed with `/api/`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/users/register/` | Create account |
| POST | `/users/login/` | Obtain JWT tokens |
| POST | `/users/logout/` | Blacklist refresh token |
| GET/PATCH | `/users/profile/` | Get / update own profile |
| POST | `/users/{id}/subscribe/` | Toggle subscription |

### Videos

| Method | Endpoint | Description |
|---|---|---|
| GET | `/videos/` | List videos (search, category, sort) |
| POST | `/videos/upload/` | Upload video (multipart) |
| GET | `/videos/{id}/` | Video detail + HLS URL |
| DELETE | `/videos/{id}/delete/` | Delete own video |
| GET | `/videos/trending/` | Top trending videos |
| GET | `/videos/my-videos/` | Authenticated user's videos |
| POST | `/videos/{id}/like/` | Toggle like |
| POST | `/videos/{id}/view/` | Increment view count |
| GET/POST | `/videos/{id}/comments/` | List / add comments |
| DELETE | `/videos/comments/{id}/delete/` | Delete comment |
| GET | `/videos/categories/` | All categories |

### Recommendations & Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/recommendations/for-me/` | Personalised video feed |
| GET | `/recommendations/similar/{id}/` | Similar videos |
| POST | `/analytics/watch-progress/` | Record watch event |
| GET | `/analytics/history/` | Watch history |
| GET | `/analytics/user-stats/` | User engagement stats |

### Admin Panel (staff/admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin-panel/dashboard/` | Platform stats |
| GET | `/api/admin-panel/activity/` | Recent videos & users |
| GET | `/api/admin-panel/users/` | User list (paginated, searchable) |
| PATCH/DELETE | `/api/admin-panel/users/{id}/` | Edit / delete user |
| GET | `/api/admin-panel/videos/` | All videos |
| PATCH/DELETE | `/api/admin-panel/videos/{id}/` | Edit / delete video |
| GET/POST | `/api/admin-panel/categories/` | List / create category |
| DELETE | `/api/admin-panel/categories/{id}/` | Delete category |
| POST | `/api/admin-panel/trigger-trending/` | Recalculate trending now |
| POST | `/api/admin-panel/trigger-retrain/` | Retrain ML model now |

---

## Video Processing Pipeline

1. User uploads video via `/videos/upload/`.
2. File saved to `media/videos/original/`.
3. A background thread (or Celery worker in Docker) picks up the task.
4. FFmpeg extracts `duration` and detects source height.
5. FFmpeg generates a thumbnail at 5 seconds (`media/thumbnails/`).
6. FFmpeg transcodes to available resolutions ≤ source height (1080p, 720p, 480p, 360p), outputting HLS segments + `.m3u8` manifest per quality.
7. A master `.m3u8` playlist is created linking all quality levels.
8. `Video.status` is set to `READY`; HLS URL is returned in the video detail API.

---

## Admin Panel

Access the React admin panel at `/admin` in the browser (requires an account with `is_staff=True` or `role='admin'`).

The Django built-in admin is also available at `http://localhost:8000/admin/` (or `http://localhost/admin/` in Docker).

### Promoting a user to admin (CLI)

```bash
python manage.py shell -c "
from users.models import User
u = User.objects.get(username='alice')
u.is_staff = True; u.role = 'ADMIN'; u.save()
"
```

---

## Keyboard Shortcuts (Video Player)

| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek −10s / +10s |
| `↑` / `↓` | Volume +10% / −10% |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `T` | Toggle Theater Mode |

---

## Security Notes

- JWT access tokens expire in 60 minutes; refresh tokens in 7 days.
- Sensitive endpoints require `IsAuthenticated` or `IsAdminUser` permission.
- CORS is restricted to configured `CORS_ALLOWED_ORIGINS`.
- `DEBUG=0` must be set in production.
- `SECRET_KEY` must be unique per deployment.
- Video files are served directly by Nginx — no Django file-serving overhead.
- Upload size limit: 1 GB (`DATA_UPLOAD_MAX_MEMORY_SIZE` / `FILE_UPLOAD_MAX_MEMORY_SIZE`).

---

## License

MIT
