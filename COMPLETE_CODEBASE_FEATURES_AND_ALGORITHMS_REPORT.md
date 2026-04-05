# zMyTube Complete Features and Algorithms Report

## 1. Purpose of This Document
This document is a code-faithful, implementation-level inventory of the zMyTube repository.

Goals:
- Capture all product features implemented in backend and frontend.
- Capture all algorithms, heuristics, formulas, and thresholds currently used.
- Capture architecture, data model, API contracts, background jobs, and deployment behavior.
- Give you enough granular material to expand into a long-form (for example, 50-page) project report.

Scope baseline:
- Backend: Django + DRF + Celery + FFmpeg + scikit-learn recommendation engine.
- Frontend: React + Vite + Axios + HLS player + context state.
- Infra: Docker Compose, Nginx reverse proxy, Railway config, DigitalOcean scripts.


## 2. High-Level System Architecture
zMyTube is a full-stack video platform with:
- Authentication and user profiles.
- Video upload and processing pipeline (raw upload -> HLS renditions + thumbnail).
- Core social features: likes, comments, subscriptions.
- Playlist management and playlist playback queue.
- Analytics/watch-history subsystem.
- Content-based recommendation subsystem.
- Admin control plane (dashboard, moderation, category management, manual task triggers).

Runtime architecture:
- Frontend SPA serves UI and calls backend APIs.
- Backend exposes REST APIs and admin APIs.
- Celery handles asynchronous work and scheduled jobs.
- PostgreSQL/SQLite persistence (environment dependent).
- Redis optional for cache/session/celery broker.
- Nginx reverse proxy handles /api, /admin, /media, /static, and SPA fallback.


## 3. Repository Capability Map

### 3.1 Backend Apps
- core: global settings, root URLs, admin panel views, permissions, Celery bootstrapping.
- users: custom user model, JWT auth flows, profile editing, subscriptions/feed.
- videos: domain entities, upload/update/delete/listing, likes/comments, playlists, search suggestions, trending logic.
- analytics_app: watch-progress tracking, watch history, aggregate stats.
- recommendations: content-based recommender (TF-IDF + cosine), recommendation endpoints, retraining task.

### 3.2 Frontend Modules
- routing and app shell in App.jsx.
- auth and sidebar contexts.
- axios instance with token auto-refresh interceptor.
- service layer wrapping API endpoints.
- pages for home/watch/upload/auth/profile/channel/history/playlists/subscriptions/trending/admin.
- reusable components including video player, cards, navbar, sidebar, comment thread.

### 3.3 Infra and Deployment
- docker-compose for local/prod-like multi-service orchestration.
- backend/frontend Dockerfiles.
- Nginx reverse proxy config.
- Railway deployment config.
- Vercel frontend build/SPA rewrite config.
- DigitalOcean bootstrap/deploy/env generation scripts.


## 4. Technology Stack and Dependencies

Backend dependencies (requirements.txt):
- Django, Django REST Framework.
- SimpleJWT + token blacklist.
- django-cors-headers, django-filter.
- Celery + django-celery-beat.
- Redis client.
- Pillow.
- scikit-learn, pandas, numpy.
- gunicorn, psycopg2-binary.

Frontend dependencies (frontend/package.json):
- React 19, react-router-dom.
- axios.
- hls.js and video.js ecosystem.
- react-dropzone.
- react-hot-toast.
- react-icons.


## 5. Backend Data Model (Entity-Level Detail)

### 5.1 users.User (custom auth user)
Key fields:
- id: UUID primary key.
- email: unique, used as USERNAME_FIELD.
- username: required.
- bio, avatar.
- role: choices USER / ADMIN.
- subscribers_count: denormalized counter.
- created_at, updated_at.

Behavior:
- ordered by -created_at.
- string repr returns username.

### 5.2 users.Subscription
Fields:
- subscriber -> User.
- channel -> User.
- unique_together(subscriber, channel).
- created_at.

Behavior:
- ordered by -created_at.
- string repr shows subscriber -> channel.

### 5.3 videos.Category
Fields: id, name(unique), slug(unique).
Behavior: ordered by name.

### 5.4 videos.Tag
Fields: id, name(unique).
Behavior: ordered by name.

### 5.5 videos.Video
Fields:
- id UUID.
- title, description.
- uploader FK User.
- category FK Category nullable.
- tags M2M Tag.
- status enum: PROCESSING, READY, FAILED.
- original_file (upload storage), hls_path, thumbnail.
- duration.
- views_count, likes_count, comments_count, trending_score (denormalized metrics).
- created_at, updated_at.

Computed property:
- hls_url = MEDIA_URL + hls_path when present.

### 5.6 videos.Like
Fields: id, user FK, video FK, created_at.
Constraint: unique_together(user, video).

### 5.7 videos.Comment
Fields:
- id, user FK, video FK.
- parent self-FK nullable for threaded replies.
- text (max 2000).
- is_flagged bool.
- created_at, updated_at.
Behavior: ordered by -created_at.

### 5.8 videos.Playlist
Fields:
- id, owner FK User.
- name, description.
- is_public bool.
- created_at, updated_at.

Computed helpers:
- video_count via related playlist_videos count.
- thumbnail from first playlist video thumbnail.

### 5.9 videos.PlaylistVideo
Fields:
- id.
- playlist FK.
- video FK.
- position (for explicit ordering).
- added_at.
Constraints:
- unique_together(playlist, video).
Behavior:
- ordered by position then added_at.

### 5.10 analytics_app.WatchHistory
Fields:
- id, user FK, video FK.
- watch_duration, watch_percentage.
- created_at, updated_at.
Constraints:
- unique_together(user, video).
Behavior:
- ordered by -updated_at.

### 5.11 recommendations.UserPreference
Fields:
- one-to-one user.
- preference_vector JSONField.
- updated_at.
Note: currently present as data model, not actively used by current recommendation endpoints.

### 5.12 recommendations.RecommendationLog
Fields:
- user FK, video FK.
- score float.
- algorithm string default content_based.
- created_at.
Behavior:
- ordered by -score.
Note: currently present as data model, not actively written by recommendation endpoint code path.


## 6. Serializer and Validation Layer

### 6.1 users serializers
- RegisterSerializer:
  - validates password == password2.
  - applies Django password validation rules.
  - hashes password with set_password.
- UserSerializer:
  - read-only role/subscribers_count/created_at.
- ProfileUpdateSerializer:
  - editable username/bio/avatar.
- SubscriptionSerializer:
  - exposes channel_name and channel_avatar via source mapping.

### 6.2 videos serializers
- CategorySerializer, TagSerializer: basic DTOs.
- CommentSerializer:
  - enriches username and user_avatar.
  - recursive replies field via get_replies.
  - returns top 10 replies per comment.
- VideoListSerializer:
  - uploader and category denormalized labels + tags array.
- VideoDetailSerializer:
  - includes uploader_subscribers, hls_path, is_liked dynamic field.
- VideoUploadSerializer:
  - write-only video_file, category_name, tag_names.
  - creates category by name (slug generated by lowercase + spaces->hyphen).
  - writes uploaded file to original_file.
  - creates/attaches normalized lowercase tags.
- VideoUpdateSerializer:
  - partial updates title/description/thumbnail/category_name/tag_names.
  - supports clearing category via empty value.
  - replaces all tags if tag_names provided.
- PlaylistSerializer:
  - includes owner_name, video_count, thumbnail.
- PlaylistDetailSerializer:
  - extends PlaylistSerializer with videos array materialized via PlaylistVideo order.
- PlaylistVideoSerializer: transport for add/remove flows.

### 6.3 analytics serializers
- WatchProgressSerializer: accepts video, watch_duration, watch_percentage.
- WatchHistorySerializer: enriches with video_id/title/thumbnail.


## 7. API Surface (Complete Endpoint Inventory)

### 7.1 Health and Root
- GET /api/health/

### 7.2 Users APIs
- POST /api/users/register/
- POST /api/users/login/
- POST /api/users/logout/
- POST /api/users/token/refresh/
- GET/PATCH /api/users/profile/
- GET /api/users/<uuid:id>/
- POST /api/users/<uuid:user_id>/subscribe/
- GET /api/users/subscriptions/
- GET /api/users/subscriptions/feed/
- GET /api/users/<uuid:user_id>/subscription-check/

### 7.3 Videos APIs
- POST /api/videos/upload/
- GET /api/videos/
- GET /api/videos/my-videos/
- GET /api/videos/trending/
- GET /api/videos/categories/
- GET /api/videos/tags/
- GET /api/videos/<uuid:id>/
- DELETE /api/videos/<uuid:id>/delete/
- PATCH /api/videos/<uuid:id>/update/
- POST /api/videos/<uuid:video_id>/like/
- GET/POST /api/videos/<uuid:video_id>/comments/
- DELETE /api/videos/comments/<uuid:id>/delete/
- POST /api/videos/<uuid:video_id>/view/
- GET /api/videos/search-suggestions/
- GET/POST /api/videos/playlists/
- GET /api/videos/playlists/user/<uuid:user_id>/
- GET/PATCH/DELETE /api/videos/playlists/<uuid:id>/
- POST /api/videos/playlists/<uuid:playlist_id>/add-video/
- DELETE /api/videos/playlists/<uuid:playlist_id>/remove-video/<uuid:video_id>/

### 7.4 Recommendations APIs
- GET /api/recommendations/for-me/
- GET /api/recommendations/similar/<uuid:video_id>/
- POST /api/recommendations/retrain/

### 7.5 Analytics APIs
- POST /api/analytics/watch-progress/
- GET /api/analytics/history/
- GET /api/analytics/user-stats/
- GET /api/analytics/video-stats/<uuid:video_id>/

### 7.6 Admin Panel APIs
- GET /api/admin-panel/dashboard/
- GET /api/admin-panel/activity/
- GET /api/admin-panel/users/
- PATCH /api/admin-panel/users/<uuid:user_id>/
- DELETE /api/admin-panel/users/<uuid:user_id>/
- GET /api/admin-panel/videos/
- PATCH /api/admin-panel/videos/<uuid:video_id>/
- DELETE /api/admin-panel/videos/<uuid:video_id>/
- GET /api/admin-panel/categories/
- POST /api/admin-panel/categories/
- DELETE /api/admin-panel/categories/<uuid:cat_id>/
- POST /api/admin-panel/trigger-trending/
- POST /api/admin-panel/trigger-retrain/


## 8. Business Logic and Feature Flows (Backend)

### 8.1 Auth and Session Semantics
- Register/Login return user object + JWT refresh/access pair.
- Logout blacklists refresh token via SimpleJWT blacklist app.
- JWT access lifetime: 60 min, refresh lifetime: 7 days, refresh rotation enabled.

### 8.2 Subscription Toggle Algorithm
Flow:
1. lookup target channel.
2. reject self-subscription.
3. get_or_create subscription row.
4. if existing -> delete and decrement subscribers_count with floor at 0.
5. if created -> increment subscribers_count.

### 8.3 Video Upload and Processing Dispatch
- VideoUploadView creates Video row in PROCESSING state with original_file attached.
- Immediately dispatches process_video_celery.delay(video_id).
- Asynchronous worker handles media processing and status transitions.

### 8.4 Like Toggle Algorithm
Flow:
1. get_or_create Like(user, video).
2. if existed -> unlike and decrement likes_count (floored at 0).
3. if created -> increment likes_count.

### 8.5 Comments and Threading
- top-level comments queried with parent__isnull=True.
- replies fetched via prefetch and serialized recursively (capped to first 10 per parent serialization).
- creating comment increments video.comments_count.

### 8.6 Watch Progress and View Counting
Analytics path:
- WatchProgressView uses update_or_create per (user, video).
- watch_percentage clamped to max 100.
- if record newly created, increments video.views_count once.

Additional counter path:
- IncrementViewView endpoint increments views_count unconditionally.
- Frontend triggers this after playback passes 3 seconds.

Note:
- Both analytics created-branch and explicit increment endpoint can affect views_count depending on usage sequence.

### 8.7 Search Suggestion Logic
- requires query length >= 2.
- title suggestions: distinct video titles containing q, READY only, top 6.
- channel suggestions: usernames containing q, top 4 with id/avatar/subscribers_count.

### 8.8 Playlist Management
- create/list own playlists with optional search in name/description.
- public playlist listing by channel user_id and is_public=True.
- playlist detail GET returns public playlists or owner-visible private.
- add video checks ownership, READY status, duplication, sets position=count.
- remove video deletes junction then reindexes remaining positions from 0.

### 8.9 Admin Dashboard and Moderation Features
Dashboard aggregates:
- user counts and new users in last 7 days.
- video status split: total/READY/PROCESSING/FAILED.
- engagement sums: views/likes.
- watch event totals and recent activity.

Admin mutation capabilities:
- toggle user active/staff/role, delete users (cannot delete self).
- patch video status/title/description, delete videos.
- create/delete categories.
- trigger trending recalculation.
- trigger recommendation retraining.
- inspect recent videos/users activity lists.


## 9. Algorithm Catalog (All Core Algorithms and Heuristics)

## 9.1 Recommendation Engine (Most Important Section)
Implementation class: ContentBasedRecommender.

### 9.1.1 Problem Framing
This is a content-based recommendation system, not collaborative filtering.
It recommends videos similar to watched content using text feature overlap.

### 9.1.2 Feature Engineering
For each video, feature text is built as:
- title (duplicated once for extra weight)
- description
- tags joined as text
- category name

Exact composition pattern:
- text = "title title description tags category"

Implication:
- title terms have higher influence due to duplication.

### 9.1.3 Vectorization
Vectorizer config:
- TfidfVectorizer(max_features=5000, ngram_range=(1,2), stop_words='english').

Meaning:
- vocabulary capped at 5000 features.
- includes unigrams and bigrams.
- english stop words removed.

Output:
- sparse TF-IDF matrix of size [num_videos x num_features].

### 9.1.4 Personalized Recommendation Scoring
Input set:
- watched videos for user (derived from top 20 watch-history entries ordered by watch_percentage).
- all READY videos.

User profile construction:
- take TF-IDF rows corresponding to watched videos.
- compute arithmetic mean vector across these rows.

Similarity scoring:
- cosine_similarity(user_profile, tfidf_matrix).
- exclude already watched video IDs.
- sort descending by similarity score.
- return top n (default n=20).

Mathematically:
- Let V_i be TF-IDF vector of video i.
- Let W be watched index set.
- User vector U = (1/|W|) * sum(V_i for i in W).
- Score(j) = cos(U, V_j), for j not in W.
- Rank by Score descending.

### 9.1.5 Similar Video Scoring
Given seed video k:
- compute cosine similarity between V_k and every V_j.
- remove k itself.
- rank descending.
- return top n (default n=10).

### 9.1.6 Cold Start and Fallbacks
If either condition holds:
- no watched READY videos, or
- fewer than 2 READY videos in corpus,
then recommendations endpoint falls back to trending list ordered by:
- -trending_score, then -views_count.

Also, if recommendation computation throws exception, same trending fallback is returned.

### 9.1.7 Model Lifecycle
Training/fit entry points:
- on-demand: POST /api/recommendations/retrain/.
- admin tool trigger endpoint.
- scheduled Celery task nightly at 02:00.

Current operational trait:
- recommender instance kept in-process (_recommender singleton in views module).
- fit is called inside recommendation methods as needed.

### 9.1.8 Limitations and Observed Characteristics
- No implicit feedback weighting (watch time is only used to choose watched set order, not weighted in vector mean).
- No collaborative signal from other users.
- No model persistence artifact to disk; in-memory fit in service runtime.
- No RecommendationLog writes in current endpoint path (model exists but not utilized).
- Vocabulary language bias due to english stop words and pure textual representation.


## 9.2 Trending Score Algorithm
Function: calculate_trending_scores().

Inputs per READY video:
- views_count.
- likes_count.
- recent_views = WatchHistory count in last 7 days.
- days_old = max(1, age_in_days).
- decay = 1 / (1 + days_old * 0.1).

Formula:
- score = views_count*0.4 + likes_count*0.3 + recent_views*decay*0.3.
- trending_score stored rounded to 2 decimals.

Batch write:
- bulk_update on all READY videos.

Schedule:
- hourly via Celery Beat (minute 0 every hour).


## 9.3 Video Processing and Transcoding Pipeline
Main function: _do_process_video(video_id).

### 9.3.1 Pre-checks and metadata
- verifies source file exists; marks FAILED if missing.
- extracts duration via ffprobe.
- extracts thumbnail at 00:00:02 using ffmpeg, scaled/padded to 640x360.
- detects source stream height via ffprobe.

### 9.3.2 Rendition set selection
Base renditions:
- 1080p (5000k video, 192k audio)
- 720p (3000k video, 128k audio)
- 480p (1500k video, 128k audio)

Height filter:
- keep renditions where target_height <= source_height + 100.
- if none survive, fallback to 480p rendition.

Large-file optimization:
- source_size_gb >= 1.5 marks upload as large.
- for large files and >1 selected rendition, keep only highest-quality selected rendition.

### 9.3.3 Encoding strategy
For large sources:
- try remux-first command (copy video stream, AAC audio encode).
- on failure, retry with full transcode fallback.

For non-large sources:
- use full transcode with libx264 preset veryfast, CRF 23, target bitrate.

HLS settings:
- hls_time 10 seconds.
- playlist type vod.
- segment naming segment-%03d.ts.

Timeouts:
- ffmpeg rendition command timeout 3600s.

### 9.3.4 Master playlist generation
- writes master.m3u8 with EXT-X-STREAM-INF entries for successful renditions.
- BANDWIDTH derived from bitrate in kbps * 1000.
- resolution label mapped manually:
  - 1080 -> 1920x1080
  - 720 -> 1280x720
  - else -> 854x480

### 9.3.5 Finalization
- if zero successful variants -> RuntimeError -> FAILED.
- on success:
  - hls_path set to hls/<video_id>/master.m3u8
  - status set READY
  - original source file removed if possible
- saves video record at function end.

### 9.3.6 Reliability features
- Celery task has max_retries=3 and default_retry_delay=60.
- logs truncated ffmpeg stderr excerpt for diagnostics.


## 9.4 Frontend Watch-Tracking Heuristics
WatchPage logic:
- onTimeUpdate stores latest progress snapshot.
- once currentTime > 3 seconds and not yet counted, calls incrementView(video_id).
- starts periodic progress sender every 10 seconds for authenticated users.
- sendProgress posts watch_duration and watch_percentage to analytics endpoint.
- on cleanup/unmount and on-ended, final sendProgress call attempted.


## 9.5 Playlist Queue Navigation Heuristic
In watch context with playlist query param:
- queueVideos = playlist.videos.
- current index found by matching id.
- previous and next resolved by index-1 and index+1 boundaries.
- autoplay-next toggle controls automatic navigation on ended event.


## 9.6 Frontend Search Debounce Algorithms
- Navbar suggestions debounce: 280ms.
- Playlists page search debounce: 220ms.
- Playlist detail add-video search debounce: 320ms.
- Navbar suggestion dropdown delayed hide on blur: 180ms.


## 9.7 Axios Token Refresh Retry Algorithm
On response error:
- if 401 and request not already retried:
  - mark _retry = true.
  - read refresh token from localStorage.
  - POST /users/token/refresh/.
  - update localStorage tokens.
  - replay original request with new access token.
- if refresh fails:
  - clear user+tokens localStorage.
  - hard redirect to /login.


## 10. Frontend Functional Feature Inventory

## 10.1 Application Shell and Routing
- BrowserRouter wraps app.
- AuthProvider + SidebarProvider global context wrappers.
- global Navbar and Sidebar on all routes.
- ProtectedRoute guards private pages and shows spinner during auth bootstrap.

Routes:
- Public: /, /watch/:id, /trending, /login, /register, /channel/:userId.
- Protected: /upload, /profile, /history, /admin, /subscriptions, /playlists, /playlists/:id, /my-videos.

## 10.2 Auth Context
- safe JSON parsing of localStorage tokens/user to prevent startup crashes.
- startup profile validation when access token exists.
- invalid profile or token clears storage and user state.
- exposes loginUser/logoutUser helpers.

## 10.3 Home Page Features
- category chips and sort selector.
- search query from URL.
- paginated fetching with Load More.
- sorting options: newest, most viewed, most liked, trending.
- skeleton loading and empty states.
- staggered entry animation using per-card delay.

## 10.4 Watch Page Features
- HLS player embed for READY video.
- PROCESSING and FAILED fallback UIs.
- like, subscribe, share actions.
- metadata chips for category/tags/time.
- comments section with refresh callback.
- similar videos list.
- optional playlist queue panel with previous/next/autoplay.
- theater mode toggle support integrated with player.

## 10.5 Upload Page Features
- drag/drop with accepted file types.
- hard validation for max 5GB file.
- title auto-fill from filename.
- category picker from backend.
- comma-split tags input.
- optional custom thumbnail.
- upload progress bar using onUploadProgress.

## 10.6 Profile Page (from implementation summary)
- profile edit for username, bio, avatar.
- user stats from analytics (videos watched, watch duration, completion).
- own videos management and subscription listings integrated into tabs.

## 10.7 Channel Page (from implementation summary)
- channel identity panel and subscription action.
- subscription status check endpoint integration.
- channel video listing filtered by uploader.

## 10.8 History Page
- watch history list with progress values and thumbnail metadata.

## 10.9 Playlists Page
- list/create/delete playlists.
- public/private flag at create/edit level.
- search box with debounce.
- card view with video count and thumbnail preview.

## 10.10 Playlist Detail Page
- playlist metadata and ownership checks.
- edit playlist metadata and visibility.
- delete playlist.
- remove specific videos.
- add-videos side panel with search and duplicate guarding.
- watch links preserve ?playlist=id for queue mode.

## 10.11 Subscriptions Page (from implementation summary)
- channel subscriptions list + subscription feed videos.

## 10.12 Trending Page
- dedicated trending grid using trending endpoint.

## 10.13 My Videos Page (from implementation summary)
- owner video inventory.
- edit/delete actions and metadata update UX.

## 10.14 Admin Page (frontend)
- admin guard based on is_staff/is_superuser/role flag.
- tabs: dashboard/users/videos/categories/tools.
- CRUD and moderation actions wired to admin endpoints.
- manual task triggers for trending and recommendation retrain.
- destructive action confirmation modal.


## 11. Video Player Detailed Capability List
Component: VideoPlayer.jsx.

Implemented capabilities:
- HLS playback with hls.js when needed, native fallback when available.
- quality level selection including auto mode.
- playback speed control.
- seek backward/forward (10s jumps).
- fullscreen and theater mode support.
- picture-in-picture support.
- keyboard shortcuts:
  - space/k play-pause
  - left/right seek
  - up/down volume
  - m mute
  - f fullscreen
  - t theater
- buffering/loading UI states and HLS error recovery branches.
- time update callback emitting currentTime, duration, percentage.


## 12. Permissions and Access Control

DRF global default:
- IsAuthenticatedOrReadOnly.

Per-view overrides include:
- public listing/detail endpoints for videos and categories.
- authenticated required for uploads, likes, private user features.
- admin panel protected by custom IsAdminUser in core/admin_views.

Important implementation detail:
- core/admin_views admin check compares role == 'admin' (lowercase), while User model choices are USER/ADMIN uppercase.
- frontend admin checks also compare role === 'admin' plus staff/superuser flags.
- this means role-only admin access depends on lowercase value usage; staff/superuser flags still grant access.


## 13. Background Jobs and Scheduling

Celery tasks:
- videos.tasks.process_video_celery(video_id): async transcode pipeline.
- videos.tasks.calculate_trending_task(): hourly trending score recomputation.
- recommendations.tasks.train_recommendation_model(): nightly recommender retrain (02:00).

Celery behavior in settings:
- broker/backend from env (usually Redis).
- if no broker configured, tasks run eagerly (synchronously) via CELERY_TASK_ALWAYS_EAGER.

Worker settings:
- acks late enabled.
- reject on worker lost enabled.
- prefetch multiplier 1.


## 14. Infrastructure and Deployment Features

## 14.1 Docker Compose Stack
Services:
- postgres, redis, backend, celery_worker, celery_beat, frontend, nginx.

Notable runtime settings:
- backend gunicorn timeout 1800s to tolerate long uploads.
- nginx client_max_body_size 5120M.
- media and static mounted via named volumes.
- celery worker concurrency=1 (resource-conscious for heavy media tasks).

## 14.2 Nginx Routing Strategy
- /health returns static ok response.
- /api and /admin proxied to backend.
- /static and /media served directly from mounted volumes.
- / fallback proxied to frontend with SPA 404 fallback.
- Accept-Ranges enabled for /media seeking.

## 14.3 Railway and Vercel Modes
- Railway config builds backend Dockerfile and runs migrate + collectstatic + gunicorn.
- Vercel config builds frontend dist and rewrites all routes to index.html.

## 14.4 DigitalOcean Automation Scripts
- bootstrap-droplet.sh installs Docker stack, clones repo, initializes env, configures UFW.
- deploy-remote.sh rsyncs project and runs docker compose up -d --build remotely.
- generate-prod-env.sh creates secure .env.production with generated secrets and CORS/CSRF host values.


## 15. Seed and Bootstrapping Logic
Management command seed_data:
- seeds 20 predefined categories.
- creates default superuser admin@mytube.com / admin123 (if missing).
- creates demo user demo@mytube.com / demo123 (if missing).


## 16. Testing Status (Current State)
Current backend tests files exist but are placeholders only.
- analytics_app/tests.py: placeholder.
- recommendations/tests.py: placeholder.
- users/tests.py: placeholder.
- videos/tests.py: placeholder.

Implication:
- functional behavior is currently enforced by runtime code paths, not automated test coverage.


## 17. Known Implementation Quirks and Observability Notes
- Upload UI text says max 500MB in one place while code validation allows 5GB.
- View counting can happen via both watch-progress create branch and explicit increment endpoint.
- Recommendation-related models (UserPreference, RecommendationLog) are not currently integrated into serving path.
- Role case mismatch risk between ADMIN/USER model choices and lowercase checks in admin gating code.


## 18. Suggested 50-Page Report Expansion Outline
Use this document as source material for chapter expansion:
1. Product vision and requirements mapping.
2. End-to-end architecture and service topology.
3. Data model design rationale.
4. API contract and endpoint taxonomy.
5. Authentication and authorization design.
6. Video ingestion and processing engineering.
7. Recommendation system theory and implementation.
8. Trending/ranking strategy and alternatives.
9. Analytics model and user behavior tracking.
10. Frontend architecture and state management.
11. UX workflows page-by-page.
12. Admin operations and moderation tooling.
13. Deployment architecture and reliability concerns.
14. Performance considerations and scaling constraints.
15. Security posture and hardening opportunities.
16. Testing strategy gap analysis and roadmap.
17. Future enhancement backlog (collaborative filtering, model persistence, AB testing, monitoring).


## 19. Recommendation System Deep-Dive Notes for Academic Emphasis
If recommendation ML is a priority topic in your final report, prioritize these details:
- Feature representation:
  - explicit field concatenation with title upweighting.
  - TF-IDF hyperparameters and vocabulary cap implications.
- Similarity metric:
  - cosine similarity geometry and why it fits sparse vectors.
- User profile synthesis:
  - mean pooling of watched vectors and assumptions this makes.
- Cold-start handling:
  - explicit fallback to trending ranking.
- Training lifecycle:
  - nightly retraining and manual retraining triggers.
- Limitations and improvement proposals:
  - no collaborative filtering.
  - no temporal preference drift modeling.
  - no online learning or incremental fit strategy.
  - no feedback weighting by watch duration/retention in final score.
  - no explainability metadata in response.

Possible enhancement formulas for future chapter:
- weighted user profile: U = sum(w_i * V_i) / sum(w_i), with w_i based on watch_percentage.
- hybrid score: alpha * content_score + (1-alpha) * collaborative_score.
- recency-aware preference decay for watched history.


## 20. Final Summary
zMyTube is implemented as a production-oriented, feature-complete video platform with:
- robust media processing pipeline.
- full social and playlist interactions.
- analytics-informed user history.
- content-based recommendation engine.
- admin operational controls.
- containerized deployment and cloud deployment scripts.

This file is intended to be your master source of truth for preparing a long-form project report.
w