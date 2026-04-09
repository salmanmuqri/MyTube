#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo bash scripts/aws/bootstrap-ec2.sh <repo_url> [branch] [app_dir]
# Example:
#   sudo bash scripts/aws/bootstrap-ec2.sh https://github.com/<you>/MyTube.git main /opt/zmytube

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root: sudo bash $0 <repo_url> [branch] [app_dir]"
  exit 1
fi

REPO_URL=${1:-}
BRANCH=${2:-main}
APP_DIR=${3:-/opt/zmytube}

if [[ -z "$REPO_URL" ]]; then
  echo "Missing repo_url"
  exit 1
fi

echo "[1/7] Installing system packages"
apt-get update
apt-get install -y ca-certificates curl gnupg git ufw rsync

echo "[2/7] Installing Docker Engine + Compose plugin"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  | tee /etc/apt/sources.list.d/docker.list >/dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "[3/7] Cloning/Updating repository"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "[4/7] Preparing environment"
cd "$APP_DIR"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created $APP_DIR/.env from .env.example"
fi

echo "[5/7] Opening firewall ports"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[6/7] Bootstrapping complete"
echo "Edit environment now: nano $APP_DIR/.env"

echo "[7/7] Start stack manually after env is ready"
echo "cd $APP_DIR && docker compose up -d --build"
