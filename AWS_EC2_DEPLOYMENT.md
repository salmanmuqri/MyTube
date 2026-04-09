# AWS EC2 Deployment (Docker Compose)

This project now targets AWS EC2 deployment.

## 1. Your Inputs Needed

You must provide:

1. AWS region and EC2 instance type (recommended: `t3.large` minimum for FFmpeg + Celery workloads).
2. SSH access details:
- SSH user (usually `ubuntu`)
- Public host or IP
- SSH private key available locally
3. Domain (optional now, recommended later):
- Example: `mytube.example.com`
4. Final `.env` values:
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

## 2. One-Time EC2 Bootstrap

From repository root on your local machine:

```bash
sudo bash scripts/aws/bootstrap-ec2.sh <repo_url> main /opt/zmytube
```

Example:

```bash
sudo bash scripts/aws/bootstrap-ec2.sh https://github.com/<you>/MyTube.git main /opt/zmytube
```

## 3. Generate Production Env Template

```bash
bash scripts/aws/generate-ec2-env.sh <public_host_or_domain>
```

Example:

```bash
bash scripts/aws/generate-ec2-env.sh mytube.example.com
```

This creates `.env.ec2`. Copy it to remote host as `.env` and edit if needed.

## 4. Deploy Current Code to EC2

```bash
bash scripts/aws/deploy-ec2.sh <ssh_user> <ec2_host> /opt/zmytube
```

Example:

```bash
bash scripts/aws/deploy-ec2.sh ubuntu ec2-xx-xx-xx-xx.compute.amazonaws.com /opt/zmytube
```

## 5. Validate On EC2

SSH into EC2:

```bash
ssh <ssh_user>@<ec2_host>
cd /opt/zmytube
```

Check:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f celery_worker
```

API health:

```bash
curl -i http://localhost/api/health/
```

## 6. First Admin User

If needed:

```bash
docker compose exec backend python manage.py createsuperuser
```

## 7. Notes

1. Current stack serves media/static via Nginx + Docker volumes.
2. For HTTPS, add an Nginx TLS/certbot layer or place CloudFront/ALB in front.
3. For durability, use EBS volume snapshots for Docker data and Postgres backups.
