#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo bash scripts/do/bootstrap-droplet.sh <repo_url> [branch]
# Example:
#   sudo bash scripts/do/bootstrap-droplet.sh https://github.com/<you>/zMyTube.git main

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root: sudo bash $0 <repo_url> [branch]"
  exit 1
fi

REPO_URL=${1:-}
BRANCH=${2:-main}
APP_DIR=/opt/zmytube

if [[ -z "$REPO_URL" ]]; then
  echo "Missing repo_url"
  exit 1
fi

echo "[1/6] Installing system packages"
apt-get update
apt-get install -y ca-certificates curl gnupg git ufw

echo "[2/6] Installing Docker Engine + Compose plugin"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  ${VERSION_CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list >/dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "[3/6] Cloning application"
mkdir -p /opt
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "[4/6] Preparing environment file"
cd "$APP_DIR"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created $APP_DIR/.env from .env.example"
  echo "Edit it now: nano $APP_DIR/.env"
fi

echo "[5/6] Configuring firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[6/6] Bootstrap complete"
echo "Next:"
echo "  1) Edit env vars: nano $APP_DIR/.env"
echo "  2) Start stack:  cd $APP_DIR && docker compose up -d --build"
echo "  3) Check status:  cd $APP_DIR && docker compose ps"
