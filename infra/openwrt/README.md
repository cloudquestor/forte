# Forte — OpenWRT Test Rig

## Topology

```
[ Internet ]
      │
[ OpenWRT Router ]  ── LAN (192.168.1.0/24)  ──  [ Dev Machine ]
      │                                             192.168.1.x
      │                                             runs: FastAPI backend (port 8000)
      │                                                   Vite portal   (port 5173 / nginx)
      │
  [ br-captive ]  ── SSID: forte-test (open)
    192.168.99.1
      │
  [ Test Client ]
    192.168.99.x   ← gets DHCP lease, all traffic blocked until login
```

## Prerequisites

| What | Requirement |
|------|-------------|
| OpenWRT version | 22.03+ (nftables); 21.02 falls back to iptables automatically |
| SSH access | `root@<ROUTER_IP>` with key-based auth |
| Dev machine | On the router's LAN, reachable at `PORTAL_IP` |
| Radio | At least one 2.4 GHz or 5 GHz radio available |

## Quick Start

```bash
cd infra/openwrt

# 1. Start the backend on your dev machine
cd ../../backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 2. Build and serve the portal (or use Vite dev server)
cd ../portal
npm run dev -- --host   # accessible on LAN

# 3. Provision the router
cd ../infra/openwrt
ROUTER_IP=192.168.1.1 PORTAL_IP=192.168.99.10 ./setup.sh

# 4. Connect a test device to "forte-test"
#    → browser should redirect to http://192.168.99.10:5173
```

## How It Works

### Before Login
```
Test Client  →  HTTP request (any host)
             →  DNAT by nftables → portal (192.168.99.1:80)
             →  Login page shown
             →  FORWARD chain drops all other traffic
```

### After Login
```
Portal  →  POST /api/auth/login  { username, password, mac_address }
        →  Backend calls: nft add element inet forte allowed_macs { <mac> timeout 8h }
        →  FORWARD chain now accepts packets from that MAC
        →  Client redirected to original URL
```

### Session Expiry
- nftables `timeout 8h` automatically removes the MAC after 8 hours
- Explicit logout calls `DELETE /api/auth/logout` which removes the MAC immediately

## Getting the Client MAC Address

The portal needs the client's MAC to punch the firewall hole.
Two options:

**Option A — DHCP lease lookup (recommended for test rig)**

On the router, read `/tmp/dhcp.leases`:
```
# format: expiry  mac  ip  hostname  client-id
1234567890  aa:bb:cc:dd:ee:ff  192.168.99.101  android-xyz  *
```
Add a small endpoint to the backend that the portal calls with the client IP,
and the backend SSHes into the router to look up the MAC.

**Option B — Pass MAC via redirect URL**

Configure the captive portal redirect on OpenWRT to append the MAC:
```
# In /etc/config/nodogsplash or custom redirect rule:
http://192.168.99.1/?redirect=<original_url>&mac=$MAC
```
The portal reads `?mac=` from the query string and sends it with the login request.

## Teardown

```bash
ROUTER_IP=192.168.1.1 ./teardown.sh
```

Removes the SSID, captive interface, DHCP pool, and all firewall rules.
Router is restored to its original state.

## Files

```
infra/openwrt/
  network.uci     UCI fragment — captive bridge interface
  wireless.uci    UCI fragment — forte-test SSID
  dhcp.uci        UCI fragment — DHCP pool + DNS wildcard
  firewall.nft    nftables rules — block/redirect/allowlist
  setup.sh        Provision the router over SSH
  teardown.sh     Revert all changes
```
