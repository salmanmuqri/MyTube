#!/usr/bin/env bash
set -euo pipefail

# Deploy current repository state to an EC2 instance over SSH.
# Usage:
#   bash scripts/aws/deploy-ec2.sh <ssh_user> <ec2_host> [remote_dir]
# Example:
#   bash scripts/aws/deploy-ec2.sh ubuntu ec2-12-34-56-78.compute.amazonaws.com /opt/zmytube

SSH_USER=${1:-}
EC2_HOST=${2:-}
REMOTE_DIR=${3:-/opt/zmytube}

if [[ -z "$SSH_USER" || -z "$EC2_HOST" ]]; then
  echo "Usage: bash scripts/aws/deploy-ec2.sh <ssh_user> <ec2_host> [remote_dir]"
  exit 1
fi

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)

echo "[1/4] Sync repository to ${SSH_USER}@${EC2_HOST}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude '.git' \
  --exclude '.venv' \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  "${ROOT_DIR}/" "${SSH_USER}@${EC2_HOST}:${REMOTE_DIR}/"

echo "[2/4] Check env file on remote"
ssh "${SSH_USER}@${EC2_HOST}" "test -f ${REMOTE_DIR}/.env || (echo '.env missing at ${REMOTE_DIR}/.env' && exit 1)"

echo "[3/4] Build + start services"
ssh "${SSH_USER}@${EC2_HOST}" "cd ${REMOTE_DIR} && docker compose up -d --build"

echo "[4/4] Service status"
ssh "${SSH_USER}@${EC2_HOST}" "cd ${REMOTE_DIR} && docker compose ps"

echo "Deployment completed"
