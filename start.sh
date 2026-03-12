#!/usr/bin/env bash
# start.sh — Start MyTube and print access URLs

set -e

PORT="${HTTP_PORT:-80}"

echo "🎬 Starting MyTube..."
docker compose up -d

echo ""
echo "✅ MyTube started!"
echo ""

# Detect local network IP (macOS / Linux)
if command -v ipconfig &>/dev/null; then
  # macOS
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
elif command -v hostname &>/dev/null; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
else
  LOCAL_IP=""
fi

PORT_SUFFIX=""
[ "$PORT" != "80" ] && PORT_SUFFIX=":${PORT}"

echo "  📺  Local:    http://localhost${PORT_SUFFIX}"
if [ -n "$LOCAL_IP" ]; then
  echo "  🌐  Network:  http://${LOCAL_IP}${PORT_SUFFIX}"
  echo "  🔑  Admin:    http://${LOCAL_IP}${PORT_SUFFIX}/admin"
fi
echo ""
echo "Service status:"
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "To view logs:  docker compose logs -f"
echo "To stop:       docker compose down"
