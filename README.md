# forte
WiFi Authentication System for campuses and societies.

## Overview

Forte is a captive portal system. It consists of two containers:

- `forte-backend` — FastAPI service that manages users, sessions, and nftables firewall rules
- `forte-portal` — Nginx-served React SPA that provides the login and admin UI

Images are published to GitHub Container Registry:

```
ghcr.io/cloudquestor/forte-backend:latest
ghcr.io/cloudquestor/forte-portal:latest
```

---

## Quick Start (Docker Compose)

1. Create a `.env` file in the project root:

```env
# Required
FORTE_USERS=admin:yourpassword

# Optional — defaults shown
FORTE_ADMINS=admin
FORTE_SESSION_TTL=8h
FORTE_CORS_ORIGINS=http://localhost
FORTE_NFT_TABLE=forte
FORTE_NFT_SET=allowed_macs
FORTE_ROUTER_CONTAINER=

PORTAL_PORT=80
VITE_APP_NAME=Forte WiFi
VITE_APP_TAGLINE=Sign in to access the network
VITE_POLICY_TEXT=By signing in you agree to the network usage policy.
VITE_DEFAULT_REDIRECT=http://captive.apple.com/hotspot-detect.html
VITE_TOKEN_KEY=forte_token
VITE_API_URL=
```

2. Start the stack:

```sh
docker compose up -d
```

---

## Docker Run

### Backend

```sh
docker run -d \
  --name forte-backend \
  -e FORTE_USERS="admin:yourpassword" \
  -e FORTE_ADMINS="admin" \
  -e FORTE_CORS_ORIGINS="http://your-portal-host" \
  -v forte-data:/data \
  ghcr.io/cloudquestor/forte-backend:latest
```

### Portal

```sh
docker run -d \
  --name forte-portal \
  -p 80:80 \
  -e VITE_APP_NAME="Forte WiFi" \
  -e VITE_APP_TAGLINE="Sign in to access the network" \
  -e VITE_POLICY_TEXT="By signing in you agree to the network usage policy." \
  -e VITE_DEFAULT_REDIRECT="http://captive.apple.com/hotspot-detect.html" \
  -e VITE_TOKEN_KEY="forte_token" \
  -e VITE_API_URL="" \
  ghcr.io/cloudquestor/forte-portal:latest
```

---

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `FORTE_USERS` | yes | — | Comma-separated `user:pass` pairs e.g. `admin:secret,user2:pass2` |
| `FORTE_ADMINS` | no | `admin` | Comma-separated usernames with admin privileges |
| `FORTE_SESSION_TTL` | no | `8h` | Session TTL in nftables format e.g. `8h`, `30m` |
| `FORTE_CORS_ORIGINS` | no | `http://localhost` | Comma-separated allowed CORS origins |
| `FORTE_NFT_TABLE` | no | `forte` | nftables table name (must match `firewall.nft`) |
| `FORTE_NFT_SET` | no | `allowed_macs` | nftables set name (must match `firewall.nft`) |
| `FORTE_ROUTER_CONTAINER` | no | — | Docker container name to run `nft` via `docker exec` (test rig mode) |

### Portal

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | no | `` (same origin) | Backend API base URL. Leave empty when nginx proxies `/api/` |
| `VITE_APP_NAME` | no | `Forte WiFi` | Portal heading |
| `VITE_APP_TAGLINE` | no | `Sign in to access the network` | Subheading shown on login screen |
| `VITE_POLICY_TEXT` | no | `By signing in you agree to the network usage policy.` | Policy notice on login screen |
| `VITE_DEFAULT_REDIRECT` | no | `http://captive.apple.com/hotspot-detect.html` | Redirect URL after login when no `?redirect=` param is present |
| `VITE_TOKEN_KEY` | no | `forte_token` | localStorage key used to store the auth token |
