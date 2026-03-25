#!/usr/bin/env bash
# setup.sh — provision OpenWRT router as a captive portal test rig
# Usage: ROUTER_IP=192.168.1.1 PORTAL_IP=192.168.99.10 ./setup.sh

set -euo pipefail

ROUTER_IP="${ROUTER_IP:-192.168.1.1}"
PORTAL_IP="${PORTAL_IP:-192.168.99.10}"   # machine running the FastAPI backend + portal
ROUTER_SSH_PORT="${ROUTER_SSH_PORT:-22}"
SSH_KEY_OPT=( ${SSH_KEY:+-i "${SSH_KEY}"} )   # empty if SSH_KEY not set
SSH=(ssh -p "${ROUTER_SSH_PORT}" "${SSH_KEY_OPT[@]}" -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=accept-new root@"${ROUTER_IP}")

echo "▶ Connecting to OpenWRT at ${ROUTER_IP}..."
"${SSH[@]}" "uname -a" || { echo "❌ Cannot reach router at ${ROUTER_IP}. Check ROUTER_IP and SSH key."; exit 1; }

# ── 1. Copy config fragments ──────────────────────────────────────────────────
echo "▶ Uploading config files..."
SCP=(scp -P "${ROUTER_SSH_PORT}" "${SSH_KEY_OPT[@]}" -o ConnectTimeout=5 -o BatchMode=yes)
"${SCP[@]}" network.uci  root@"${ROUTER_IP}":/tmp/forte_network.uci
"${SCP[@]}" wireless.uci root@"${ROUTER_IP}":/tmp/forte_wireless.uci
"${SCP[@]}" dhcp.uci     root@"${ROUTER_IP}":/tmp/forte_dhcp.uci
"${SCP[@]}" firewall.nft root@"${ROUTER_IP}":/etc/forte_captive.nft

# ── 2. Apply UCI network + wireless ──────────────────────────────────────────
echo "▶ Applying network config..."
"${SSH[@]}" bash <<'ENDSSH'
  # Merge captive interface into network config
  uci import -m network < /tmp/forte_network.uci
  uci commit network

  # Merge captive SSID into wireless config
  uci import -m wireless < /tmp/forte_wireless.uci
  uci commit wireless

  # Merge DHCP pool
  uci import -m dhcp < /tmp/forte_dhcp.uci
  uci commit dhcp

  /etc/init.d/network restart
  sleep 3
  wifi reload
  sleep 3
  /etc/init.d/dnsmasq restart
ENDSSH

# ── 3. Load nftables firewall rules ──────────────────────────────────────────
echo "▶ Loading firewall rules..."
"${SSH[@]}" bash <<'ENDSSH'
  # OpenWRT may use nft or iptables depending on version
  if command -v nft &>/dev/null; then
    nft -f /etc/forte_captive.nft
    # Persist across reboots
    echo 'nft -f /etc/forte_captive.nft' >> /etc/rc.local
  else
    echo "⚠ nft not found — falling back to iptables"
    # iptables fallback (OpenWRT 21.x and older)
    iptables -I FORWARD -i br-captive -j DROP
    iptables -t nat -I PREROUTING -i br-captive -p tcp --dport 80  -j DNAT --to-destination "${PORTAL_IP}:80"
    iptables -t nat -I PREROUTING -i br-captive -p tcp --dport 443 -j DNAT --to-destination "${PORTAL_IP}:443"
    iptables -I INPUT -i br-captive -p udp --dport 53 -j ACCEPT
    iptables -I INPUT -i br-captive -p udp --dport 67 -j ACCEPT
    iptables -I INPUT -i br-captive -p tcp -m multiport --dports 80,443 -j ACCEPT
    # Persist
    iptables-save > /etc/iptables.forte
    echo 'iptables-restore < /etc/iptables.forte' >> /etc/rc.local
  fi
ENDSSH

echo ""
echo "✅ Test rig ready."
echo "   SSID      : forte-test (open)"
echo "   Subnet    : 192.168.99.0/24"
echo "   Portal    : http://${PORTAL_IP}"
echo ""
echo "   Connect a device to 'forte-test' — it should be redirected to the portal."
echo "   Run teardown.sh to revert all changes."
