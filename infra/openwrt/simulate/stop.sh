#!/usr/bin/env bash
# stop.sh — shut down the simulated OpenWRT router
# Pass --clean to also delete the disk image (full reset)

set -euo pipefail

cd "$(dirname "$0")"

echo "▶ Stopping simulated OpenWRT..."
docker compose down

if [[ "${1:-}" == "--clean" ]]; then
    echo "▶ Removing disk image (full reset)..."
    docker volume rm forte_openwrt-disk 2>/dev/null || true
    echo "   Next start will re-download and re-provision from scratch."
fi

echo "✅ Done."
