#!/usr/bin/env bash
# teardown.sh — revert all captive portal changes from the OpenWRT router
# Usage: ROUTER_IP=192.168.1.1 ./teardown.sh

set -euo pipefail

ROUTER_IP="${ROUTER_IP:-192.168.1.1}"
SSH="ssh root@${ROUTER_IP}"

echo "▶ Reverting OpenWRT config at ${ROUTER_IP}..."

$SSH bash <<'ENDSSH'
  # ── Remove UCI config additions ──────────────────────────────────────────
  uci delete network.captive   2>/dev/null || true
  uci delete wireless.forte_test 2>/dev/null || true
  uci delete dhcp.captive      2>/dev/null || true
  uci commit network
  uci commit wireless
  uci commit dhcp

  # ── Flush nftables table ─────────────────────────────────────────────────
  nft delete table inet forte 2>/dev/null || true
  rm -f /etc/forte_captive.nft

  # ── Flush iptables fallback rules ────────────────────────────────────────
  iptables -D FORWARD -i br-captive -j DROP                                    2>/dev/null || true
  iptables -t nat -D PREROUTING -i br-captive -p tcp --dport 80  -j DNAT --to-destination 0.0.0.0:80  2>/dev/null || true
  iptables -t nat -D PREROUTING -i br-captive -p tcp --dport 443 -j DNAT --to-destination 0.0.0.0:443 2>/dev/null || true
  rm -f /etc/iptables.forte

  # ── Remove rc.local entries ──────────────────────────────────────────────
  sed -i '/forte_captive/d'       /etc/rc.local 2>/dev/null || true
  sed -i '/iptables.forte/d'      /etc/rc.local 2>/dev/null || true

  # ── Restart services ─────────────────────────────────────────────────────
  /etc/init.d/network restart
  sleep 3
  wifi reload
  /etc/init.d/dnsmasq restart
ENDSSH

echo "✅ Teardown complete. Router restored to original state."
