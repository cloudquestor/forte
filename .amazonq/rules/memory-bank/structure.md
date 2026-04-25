# Forte — Project Structure

## Directory Layout

```
forte/
├── backend/               # FastAPI service (Python)
│   ├── main.py            # App entrypoint, all API route definitions
│   ├── auth.py            # JWT token creation/verification, password hashing
│   ├── config.py          # Settings loaded from environment variables
│   ├── db.py              # JSON file-based user/session persistence (/data)
│   ├── firewall.py        # nftables MAC allowlist management (local or docker exec)
│   ├── omada.py           # TP-Link Omada controller client (login + authorize)
│   ├── otp.py             # OTP generation/verification (MSG91 or dummy)
│   ├── log.py             # Structured logging setup
│   ├── Dockerfile         # Python 3.12-slim image
│   └── requirements.txt   # fastapi, uvicorn, pydantic, requests
│
├── portal/                # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx            # Root router: path-based screen switching
│   │   ├── config.js          # Runtime config from window.__FORTE_CONFIG__
│   │   ├── api.js             # All fetch() calls to /api/* endpoints
│   │   ├── msg91.js           # MSG91 OTP widget integration helpers
│   │   ├── loginUtils.js      # Shared login/OTP flow utilities
│   │   ├── loginComponents.jsx # Reusable form primitives (Field, OtpInput, etc.)
│   │   ├── LoginScreen.jsx    # Main login + OTP + signup entry point
│   │   ├── ForgotScreen.jsx   # Password reset flow (mobile → OTP → new password)
│   │   ├── AdminScreen.jsx    # Admin dashboard (user/session management)
│   │   ├── StatusScreen.jsx   # Post-login success/failure display
│   │   ├── PolicyScreen.jsx   # Renders policy.md content
│   │   ├── OtpForm.jsx        # Standalone OTP entry form
│   │   ├── PasswordForm.jsx   # New password entry form
│   │   └── SignupForm.jsx     # New user registration form
│   ├── nginx.conf         # Nginx config: proxies /api/ to backend, SPA fallback, captive portal detection endpoints
│   ├── entrypoint.sh      # Injects VITE_* env vars into window.__FORTE_CONFIG__ at container start
│   ├── Dockerfile         # Multi-stage: Vite build → Nginx serve
│   └── package.json       # React 18, Vite 4, Tailwind 3
│
├── infra/openwrt/         # OpenWrt firewall and network configuration
│   ├── firewall.nft       # nftables rules: allowed_macs set, forward/prerouting/input chains
│   ├── setup.sh / teardown.sh  # Load/flush nft rules
│   └── simulate/          # Docker-based OpenWrt test rig (docker-compose + scripts)
│
├── rules/requirements.md  # Product requirements document
├── docker-compose.yml     # Orchestrates backend + portal with shared `forte` network
├── .env                   # Local environment variable overrides
└── README.md
```

## Routing Architecture

App.jsx uses `window.location.pathname` (no router library) for screen selection:
- `/` → `LoginScreen` (public login/signup)
- `/admin` → `LoginScreen` (adminMode) → `AdminScreen` (after token)
- `/status` → `StatusScreen`
- `/policy` → `PolicyScreen`

Nginx serves the SPA with a catch-all fallback and proxies `/api/` to `http://backend:8000`.

## Data Flow

1. Client hits portal → Nginx serves React SPA
2. User authenticates → portal POSTs to `/api/login`
3. Backend verifies credentials, adds MAC to nftables `allowed_macs` set (or calls Omada API), returns JWT
4. Portal stores JWT in `localStorage` under `tokenKey`
5. Client is redirected to `redirectUrl` or `defaultRedirect`

## Key Relationships
- `config.js` reads `window.__FORTE_CONFIG__` injected by `entrypoint.sh` at container start (runtime env injection pattern)
- `api.js` is the single source of truth for all backend calls; all screens import from it
- `firewall.py` and `omada.py` are alternative backends for MAC authorization — selected by config presence
- `db.py` persists users and sessions as JSON files under the `/data` Docker volume
