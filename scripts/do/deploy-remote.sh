#!/usr/bin/env bash
set -euo pipefail

# Deploy current repository state to a DigitalOcean droplet over SSH.
# Usage:
#   bash scripts/do/deploy-remote.sh <ssh_user> <droplet_ip> [remote_dir]
# Example:
#   bash scripts/do/deploy-remote.sh root 203.0.113.10 /opt/zmytube

SSH_USER=${1:-}
DROPLET_IP=${2:-}
REMOTE_DIR=${3:-/opt/zmytube}

if [[ -z "$SSH_USER" || -z "$DROPLET_IP" ]]; then
  echo "Usage: bash scripts/do/deploy-remote.sh <ssh_user> <droplet_ip> [remote_dir]"
  exit 1
fi

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)

echo "[1/4] Syncing repository to ${SSH_USER}@${DROPLET_IP}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude '.git' \
  --exclude '.venv' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  "${ROOT_DIR}/" "${SSH_USER}@${DROPLET_IP}:${REMOTE_DIR}/"

echo "[2/4] Verifying env file on remote host"
ssh "${SSH_USER}@${DROPLET_IP}" "test -f ${REMOTE_DIR}/.env || (echo '.env missing at ${REMOTE_DIR}/.env' && exit 1)"

echo "[3/4] Building and starting services"
ssh "${SSH_USER}@${DROPLET_IP}" "cd ${REMOTE_DIR} && docker compose up -d --build"

echo "[4/4] Showing service status"
ssh "${SSH_USER}@${DROPLET_IP}" "cd ${REMOTE_DIR} && docker compose ps"

echo "Deployment completed"
