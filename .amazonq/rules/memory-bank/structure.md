# Forte — Project Structure

## Directory Layout

```
forte/
├── backend/              # FastAPI authentication service
│   ├── main.py           # API routes and app entrypoint
│   ├── auth.py           # Login/logout logic, token generation
│   ├── db.py             # SQLite persistence (users, sessions, events)
│   ├── firewall.py       # nftables MAC allow/revoke via subprocess
│   ├── config.py         # Environment variable loading
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile
├── portal/               # React SPA (captive portal UI)
│   ├── src/
│   │   ├── App.jsx           # Route dispatcher (login / admin / status)
│   │   ├── LoginScreen.jsx   # Login form (user + admin mode)
│   │   ├── AdminScreen.jsx   # Admin dashboard (sessions, users)
│   │   ├── StatusScreen.jsx  # Post-login status/redirect page
│   │   ├── api.js            # All fetch calls to backend API
│   │   └── config.js         # Runtime env vars (VITE_*)
│   ├── nginx.conf        # Nginx config: SPA fallback + /api/ proxy + captive detection
│   ├── entrypoint.sh     # Injects VITE_* env vars at container start
│   ├── Dockerfile
│   └── package.json
├── infra/openwrt/        # OpenWRT configuration and simulation rig
│   ├── firewall.nft      # nftables ruleset (defines forte table + allowed_macs set)
│   ├── simulate/         # Docker-based OpenWRT test environment
│   └── *.uci / *.sh      # UCI config files and setup/teardown scripts
├── rules/
│   └── requirements.md   # Original product requirements document
├── docker-compose.yml    # Production stack definition
└── README.md
```

## Core Components and Relationships

```
[User Device]
     │ HTTP (port 80)
     ▼
[forte-portal — Nginx]
     │ serves SPA (React)
     │ proxies /api/ → backend:8000
     ▼
[forte-backend — FastAPI]
     │ auth.py: validates credentials, issues token
     │ db.py: SQLite at /data/forte.db
     │ firewall.py: runs `nft` to add/remove MAC from set
     ▼
[nftables on router]
     └── inet table `forte`, set `allowed_macs` (with TTL)
```

## Routing (Portal SPA)
Path-based routing without a router library:
- `/` → LoginScreen (user mode, no token stored)
- `/admin` → LoginScreen (admin mode) → AdminScreen
- `/status` → StatusScreen (post-login redirect target)

## API Endpoints (Backend)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | none | Authenticate, get token, allow MAC |
| DELETE | `/api/auth/logout` | Bearer | Revoke token, remove MAC |
| GET | `/health` | none | Health check |
| GET | `/api/stats` | admin | Session/event stats |
| GET | `/api/users` | admin | List all users |
| POST | `/api/users` | admin | Create user |
| PUT | `/api/users/{username}` | admin | Update user profile |
| PUT | `/api/users/{username}/password` | admin | Change password |
| DELETE | `/api/users/{username}` | admin | Delete user |

## OTP Integration
- MSG91 SMS OTP service integration
- Endpoints: `/api/otp/send`, `/api/otp/verify`, `/api/otp/resend`
- Requires `MSG91_AUTHKEY` and `MSG91_TEMPLATE_ID` environment variables
- Uses requests library for HTTP calls to MSG91 API

## Firewall Integration
- `firewall.py` wraps `nft add/delete element` commands
- In test mode (`FORTE_ROUTER_CONTAINER` set): runs via `docker exec <container> nft`
- In production: runs `nft` directly on the host
- MAC entries in the nftables set carry a TTL matching `FORTE_SESSION_TTL`
- If `nft` binary is absent (dev environment), commands are silently no-op'd

## Nginx Captive Portal Detection
Nginx handles OS-specific captive portal probe endpoints:
- `/hotspot-detect.html` → iOS/macOS (200 with Success body)
- `/generate_204` → Android/Chrome (204)
- `/connecttest.txt` → Windows (200 with Microsoft Connect Test)
