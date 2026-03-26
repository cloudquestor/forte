# Forte Portal — Captive Portal Frontend

Browser-based login screen for the Forte WiFi authentication system. Built with React + Vite + Tailwind CSS. Served in production via nginx with a built-in reverse proxy to the FastAPI backend.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 4 |
| Styling | Tailwind CSS 3 |
| Production server | nginx 1.25 (Alpine) |
| Container | Docker (multi-stage build) |

---

## Project Structure

```
portal/
├── src/
│   ├── config.js          # All runtime config — single source of truth
│   ├── api.js             # Login / logout API calls
│   ├── LoginScreen.jsx    # Main login UI component
│   ├── App.jsx            # Root component
│   ├── main.jsx           # Entry point
│   └── index.css          # Tailwind directives
├── .env.local             # Dev environment variables (not committed)
├── .env.production        # Production defaults (committed, no secrets)
├── Dockerfile             # Multi-stage build → nginx
├── nginx.conf             # nginx: SPA fallback + /api proxy + captive detection
├── vite.config.js         # Vite config with dev proxy
├── tailwind.config.js
└── package.json
```

---

## Environment Variables

All variables are prefixed with `VITE_` and baked into the build at compile time.  
Set them in `.env.local` for development or pass as `--build-arg` for Docker builds.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `""` (same origin) | Base URL of the FastAPI backend. Empty string means nginx proxies `/api/*` on the same host. Set to `http://localhost:8000` for local dev. |
| `VITE_DEFAULT_REDIRECT` | `http://captive.apple.com/hotspot-detect.html` | Where to send the user after successful login when no `?redirect=` query param is present. |
| `VITE_APP_NAME` | `Forte WiFi` | Portal heading shown on the login screen. |
| `VITE_APP_TAGLINE` | `Sign in to access the network` | Subheading below the app name. |
| `VITE_POLICY_TEXT` | `By signing in you agree to the network usage policy.` | Footer text shown below the login form. |
| `VITE_TOKEN_KEY` | `forte_token` | Key used to store the auth token in `sessionStorage`. |

### How the redirect works

The captive portal controller (OpenWRT) appends the client's original destination to the login URL:

```
http://<portal-ip>/?redirect=https://example.com&mac=aa:bb:cc:dd:ee:ff
```

After login, the portal reads `?redirect=` and navigates there. If absent, `VITE_DEFAULT_REDIRECT` is used. The `?mac=` param is forwarded to the backend to punch the firewall hole for that device.

---

## Run Commands

### Development

```bash
npm install
npm run dev
# → http://localhost:5173
# API calls to /api/* are proxied to VITE_API_URL (default: http://localhost:8000)
```

### Production build (static files)

```bash
npm run build
# Output in dist/
npm run preview   # preview the production build locally
```

### Docker — default config

```bash
docker build -t forte-portal .
docker run -p 80:80 forte-portal
# → http://localhost
```

### Docker — custom config

Pass any `VITE_*` variable as a build arg:

```bash
docker build \
  --build-arg VITE_API_URL="" \
  --build-arg VITE_APP_NAME="Campus WiFi" \
  --build-arg VITE_APP_TAGLINE="Sign in with your student ID" \
  --build-arg VITE_DEFAULT_REDIRECT="https://university.edu/welcome" \
  --build-arg VITE_POLICY_TEXT="By signing in you agree to the acceptable use policy." \
  -t forte-portal .

docker run -p 80:80 forte-portal
```

### Docker — full stack with backend

```bash
docker network create forte-net

# Backend
docker run -d --name backend \
  --network forte-net \
  -e FORTE_ROUTER_CONTAINER=forte-openwrt \
  -p 8000:8000 \
  forte-backend

# Portal (nginx proxies /api/* → backend container by hostname)
docker build -t forte-portal .
docker run -d --name forte-portal \
  --network forte-net \
  -p 80:80 \
  forte-portal
```

---

## nginx Behaviour

The bundled `nginx.conf` handles three things:

**1. SPA fallback** — all routes serve `index.html` so React Router works correctly.

**2. API proxy** — `/api/*` is forwarded to `http://backend:8000`. In Docker Compose the backend service must be named `backend`. Override the upstream in `nginx.conf` if needed.

**3. Captive portal detection endpoints** — responds to OS connectivity probes so devices show the "Sign in to network" prompt automatically:

| Path | OS | Response |
|---|---|---|
| `/hotspot-detect.html` | iOS / macOS | `200 Success` |
| `/generate_204` | Android / Chrome | `204 No Content` |
| `/connecttest.txt` | Windows | `200 Microsoft Connect Test` |

---

## Captive Portal Flow

```
Device connects to WiFi (forte-test SSID)
        ↓
OS sends connectivity probe (e.g. /generate_204)
        ↓
OpenWRT DNAT → portal nginx
        ↓
nginx returns non-204 → OS shows "Sign in to network" prompt
        ↓
User opens browser → redirected to /?redirect=<original_url>&mac=<mac>
        ↓
User submits login form
        ↓
POST /api/auth/login → FastAPI backend validates credentials
        ↓
Backend calls nft to add MAC to allowed_macs set on OpenWRT
        ↓
window.location.href = redirect URL
        ↓
Traffic flows freely (nftables timeout: 8h)
```

---

## Adding a New Config Variable

1. Add the `VITE_` variable to `.env.local` and `.env.production`
2. Add it to `src/config.js` with a default value
3. Use `config.<key>` anywhere in the app
4. Pass it as `--build-arg` in Docker builds

---

## Related

- `../backend/` — FastAPI authentication server
- `../infra/openwrt/` — OpenWRT firewall config and provisioning scripts
- `../infra/openwrt/simulate/` — Docker-based OpenWRT simulation
