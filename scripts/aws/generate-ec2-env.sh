#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/aws/generate-ec2-env.sh <public_host_or_domain>
# Example:
#   bash scripts/aws/generate-ec2-env.sh mytube.example.com

PUBLIC_HOST=${1:-}
if [[ -z "$PUBLIC_HOST" ]]; then
  echo "Usage: bash scripts/aws/generate-ec2-env.sh <public_host_or_domain>"
  exit 1
fi

SECRET_KEY=$(openssl rand -base64 50 | tr -d '\n')
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

cat > .env.ec2 <<EOF
SECRET_KEY=${SECRET_KEY}
DEBUG=0
ALLOWED_HOSTS=${PUBLIC_HOST},localhost,127.0.0.1
DATABASE_URL=
POSTGRES_DB=mytube
POSTGRES_USER=mytube
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=http://${PUBLIC_HOST}
CORS_ALLOWED_ORIGIN_REGEXES=
CSRF_TRUSTED_ORIGINS=http://${PUBLIC_HOST}
CORS_ALLOW_ALL_ORIGINS=false
ENABLE_MEDIA_SERVING=true
HTTP_PORT=80
VITE_API_BASE_URL=/api
VITE_MEDIA_BASE_URL=/media
EOF

echo "Created .env.ec2"
echo "Review and adjust before use: cat .env.ec2"
