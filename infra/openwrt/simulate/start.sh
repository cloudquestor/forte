#!/usr/bin/env bash
# start.sh — boot the simulated OpenWRT router and provision it
# Usage: PORTAL_IP=192.168.99.10 ./start.sh

set -euo pipefail

PORTAL_IP="${PORTAL_IP:-192.168.1.1}"   # your dev machine IP on the lan network
ROUTER_SSH_PORT=2222
ROUTER_IP=127.0.0.1
KEY="$(docker volume inspect forte_openwrt-disk --format '{{.Mountpoint}}' 2>/dev/null)/forte_key"
SSH_OPTS="-p ${ROUTER_SSH_PORT} -i ${KEY} -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=3"

cd "$(dirname "$0")"

# ── 1. Start the container ────────────────────────────────────────────────────
echo "▶ Starting simulated OpenWRT..."
docker compose up -d

# ── 2. Wait for QEMU to boot and OpenWRT SSH to come up ──────────────────────
echo "▶ Waiting for OpenWRT to boot (this takes ~60s on first run)..."
ATTEMPTS=0
until ssh $SSH_OPTS root@${ROUTER_IP} "uname -a" &>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ $ATTEMPTS -ge 40 ]; then
        echo "❌ OpenWRT did not come up after $((ATTEMPTS * 5))s."
        echo "   Check logs with: docker compose logs -f"
        exit 1
    fi
    printf "."
    sleep 5
done
echo ""
echo "✅ OpenWRT is up."

# ── 3. Inject SSH public key into OpenWRT (idempotent) ───────────────────────
PUBKEY=$(cat "${KEY}.pub")
ssh $SSH_OPTS root@${ROUTER_IP} "
    mkdir -p /etc/dropbear
    grep -qF '${PUBKEY}' /etc/dropbear/authorized_keys 2>/dev/null \
        || echo '${PUBKEY}' >> /etc/dropbear/authorized_keys
"
echo "▶ SSH key injected."

# ── 4. Run setup.sh against the simulated router ─────────────────────────────
echo "▶ Provisioning captive portal config..."
ROUTER_IP=${ROUTER_IP} \
ROUTER_SSH_PORT=${ROUTER_SSH_PORT} \
PORTAL_IP=${PORTAL_IP} \
SSH_KEY=${KEY} \
    ../setup.sh

echo ""
echo "✅ Simulated router ready."
echo "   SSH  : ssh -p 2222 -i ${KEY} root@127.0.0.1"
echo "   LuCI : http://localhost:8080"
echo "   Logs : docker compose logs -f"
