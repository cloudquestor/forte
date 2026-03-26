#!/usr/bin/env bash
# start.sh — boot the simulated OpenWRT router and provision it
# Usage: PORTAL_IP=10.99.1.x ./start.sh

set -euo pipefail

PORTAL_IP="${PORTAL_IP:-10.99.1.1}"
cd "$(dirname "$0")"

echo "▶ Starting simulated OpenWRT..."
docker compose up -d

echo "▶ Waiting for dropbear SSH..."
for i in $(seq 1 15); do
    if docker exec forte-openwrt sh -c \
        "DROPBEAR_PASSWORD=forte123 dbclient -y root@127.0.0.1 'echo OK' 2>/dev/null" | grep -q OK; then
        break
    fi
    printf "."; sleep 2
done
echo ""

echo "▶ Provisioning captive portal config..."
ROUTER_IP=127.0.0.1 \
ROUTER_SSH_PORT=2222 \
PORTAL_IP="${PORTAL_IP}" \
    ../setup.sh

echo ""
echo "✅ Simulated router ready."
echo "   SSH  : docker exec -it forte-openwrt sh"
echo "   SSH  : DROPBEAR_PASSWORD=forte123 dbclient -p 2222 root@127.0.0.1"
echo "   LuCI : http://localhost:8080"
echo "   Logs : docker compose logs -f"
