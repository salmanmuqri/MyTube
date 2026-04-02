# DigitalOcean Deployment (Droplet + Docker Compose)

This guide is optimized for a GitHub Student setup: one Ubuntu droplet running the full stack.

## What I already prepared in this repo

- `scripts/do/bootstrap-droplet.sh` - installs Docker and prepares the server.
- `scripts/do/generate-prod-env.sh` - generates a secure production env file.
- `scripts/do/deploy-remote.sh` - syncs and deploys the app to your droplet.
- `backend/Dockerfile` and `backend/Dockerfile.railway` split so Docker Compose and Railway each work correctly.

## Your required touches (dashboard-level only)

1. Create a DigitalOcean droplet:
- Ubuntu 24.04 LTS
- Basic plan, 2 vCPU / 4 GB RAM minimum
- Region close to you
- Add your SSH key

2. Point your domain (optional but recommended):
- Create an `A` record to droplet public IP

3. Keep these values ready:
- Droplet IP
- SSH user (`root` or your sudo user)
- Frontend URL (Vercel production URL)

## Step 1: Bootstrap droplet

Run this on the droplet after SSH login:

```bash
sudo bash /opt/zmytube/scripts/do/bootstrap-droplet.sh https://github.com/<your-org-or-user>/<your-repo>.git main
```

If you did not clone to `/opt/zmytube` yet, do this first:

```bash
sudo mkdir -p /opt
sudo git clone https://github.com/<your-org-or-user>/<your-repo>.git /opt/zmytube
```

## Step 2: Generate production env file locally

From your local repo:

```bash
bash scripts/do/generate-prod-env.sh <droplet-ip-or-domain> <vercel-frontend-origin>
```

Example:

```bash
bash scripts/do/generate-prod-env.sh mytube.example.com https://my-tube.vercel.app
```

Then copy to remote as `.env`:

```bash
scp .env.production root@<droplet-ip>:/opt/zmytube/.env
```

## Step 3: Deploy to droplet

From your local repo:

```bash
bash scripts/do/deploy-remote.sh root <droplet-ip> /opt/zmytube
```

## Step 4: Verify

```bash
curl http://<droplet-ip>/health
curl http://<droplet-ip>/api/health/
```

Expected backend response:

```json
{"status":"ok"}
```

## Step 5: Create admin user

```bash
ssh root@<droplet-ip> "cd /opt/zmytube && docker compose exec backend python manage.py createsuperuser"
```

## Troubleshooting

- Show containers:
```bash
ssh root@<droplet-ip> "cd /opt/zmytube && docker compose ps"
```

- Tail logs:
```bash
ssh root@<droplet-ip> "cd /opt/zmytube && docker compose logs -f --tail=200"
```

- Restart stack:
```bash
ssh root@<droplet-ip> "cd /opt/zmytube && docker compose down && docker compose up -d --build"
```

## Notes

- This setup keeps Postgres and Redis on the same droplet for simplicity and low cost.
- For higher reliability later, move Postgres to a managed DB and Redis to managed cache.
