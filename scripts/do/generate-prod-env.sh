#!/usr/bin/env bash
set -euo pipefail

# Generates .env.production with secure defaults for DigitalOcean VM deployment.
# Usage:
#   bash scripts/do/generate-prod-env.sh <domain_or_ip> <frontend_origin>
# Example:
#   bash scripts/do/generate-prod-env.sh 203.0.113.10 https://mytube.vercel.app

DOMAIN_OR_IP=${1:-}
FRONTEND_ORIGIN=${2:-}

if [[ -z "$DOMAIN_OR_IP" || -z "$FRONTEND_ORIGIN" ]]; then
  echo "Usage: bash scripts/do/generate-prod-env.sh <domain_or_ip> <frontend_origin>"
  exit 1
fi

SECRET_KEY=$(openssl rand -base64 50 | tr -d '\n')
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

cat > .env.production <<EOF
SECRET_KEY=${SECRET_KEY}
DEBUG=0
ALLOWED_HOSTS=${DOMAIN_OR_IP},localhost,127.0.0.1
POSTGRES_DB=mytube
POSTGRES_USER=mytube
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=${FRONTEND_ORIGIN}
CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\\.vercel\\.app$
CSRF_TRUSTED_ORIGINS=${FRONTEND_ORIGIN}
CORS_ALLOW_ALL_ORIGINS=false
ENABLE_MEDIA_SERVING=true
HTTP_PORT=80
VITE_API_BASE_URL=/api
VITE_MEDIA_BASE_URL=/media
EOF

echo "Created .env.production"
echo "Review it now: cat .env.production"
