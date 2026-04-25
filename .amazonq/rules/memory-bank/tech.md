# Forte — Technology Stack

## Backend (`backend/`)

| Concern | Technology |
|---|---|
| Language | Python 3.12 |
| Framework | FastAPI 0.111.0 |
| Server | Uvicorn 0.30.1 (standard extras) |
| Validation | Pydantic 2.7.1 |
| HTTP client | requests 2.32.3 |
| Auth | JWT (HS256, custom impl in auth.py) |
| Persistence | JSON files on `/data` volume (no database) |
| Firewall | nftables via subprocess or `docker exec` |
| Container | python:3.12-slim, non-root user `forte`, port 8000 |

## Frontend (`portal/`)

| Concern | Technology |
|---|---|
| Language | JavaScript (JSX), ES modules |
| Framework | React 18.2 |
| Build tool | Vite 4.4.5 |
| Styling | Tailwind CSS 3.4 |
| Linter | ESLint 8 with react, react-hooks, react-refresh plugins |
| Container | Node 18-alpine (build) → nginx:1.25-alpine (serve), port 80 |

## Tailwind Brand Palette
Custom `brand` color scale (orange/brown tones): 50–900. Use `brand-600` for primary actions, `brand-500`/`brand-700` for hover states.

## Runtime Config Injection
Portal env vars (`VITE_*`) are injected at container start by `entrypoint.sh` into `window.__FORTE_CONFIG__` in `index.html`. `config.js` reads from this object with fallback defaults — no rebuild needed to change config.

## Development Commands

### Backend
```sh
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Portal
```sh
cd portal
npm install
npm run dev        # Vite dev server on :5173, proxies /api/ to :8000
npm run build      # Production build to dist/
npm run lint       # ESLint check
```

### Full Stack (Docker Compose)
```sh
cp .env.example .env   # fill in FORTE_USERS at minimum
docker compose up -d
docker compose logs -f
```

### OpenWrt Test Rig
```sh
cd infra/openwrt/simulate
./start.sh    # spins up simulated router container
./stop.sh
```

## Key Environment Variables

| Variable | Where used |
|---|---|
| `FORTE_USERS` | Backend — comma-separated `user:pass` pairs |
| `FORTE_ADMINS` | Backend — usernames with admin privileges |
| `FORTE_SESSION_TTL` | Backend + nftables timeout (e.g. `8h`) |
| `FORTE_ROUTER_CONTAINER` | Backend — docker exec target for nft commands |
| `OMADA_CONTROLLER_URL` / `OMADA_CONTROLLER_ID` | Backend — Omada integration |
| `FORTE_MSG91_*` | Backend — MSG91 OTP service credentials |
| `FORTE_OTP_DUMMY` / `FORTE_OTP_DUMMY_CODE` | Backend — dev OTP bypass |
| `VITE_API_URL` | Portal — backend URL (empty = same-origin via nginx proxy) |
| `VITE_MSG91_WIDGET_ID` / `VITE_MSG91_TOKEN_AUTH` | Portal — MSG91 widget |
