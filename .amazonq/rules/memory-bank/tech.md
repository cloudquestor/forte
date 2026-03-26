# Forte — Technology Stack

## Backend

| Item | Detail |
|------|--------|
| Language | Python 3.12 |
| Framework | FastAPI 0.111.0 |
| ASGI Server | Uvicorn 0.30.1 (with standard extras) |
| Validation | Pydantic 2.7.1 |
| Password hashing | bcrypt 4.1.3 |
| Database | SQLite (via stdlib `sqlite3`), file at `/data/forte.db` |
| Firewall control | `subprocess` calling `nft` (or `docker exec <container> nft`) |
| Container base | `python:3.12-slim`, runs as non-root user `forte` (uid 1001) |
| Port | 8000 |

### Backend Dev Commands
```sh
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn main:app --reload --port 8000

# Build image
docker build -t forte-backend ./backend
```

---

## Portal (Frontend)

| Item | Detail |
|------|--------|
| Language | JavaScript (ES modules, JSX) |
| Framework | React 18.2 |
| Build tool | Vite 4.4.5 |
| Styling | Tailwind CSS 3.4 + PostCSS + Autoprefixer |
| Linter | ESLint 8 with `eslint-plugin-react`, `react-hooks`, `react-refresh` |
| Node version | 18 (Alpine, build stage) |
| Serve | Nginx 1.25-Alpine |
| Port | 80 (container), configurable via `PORTAL_PORT` on host |

### Portal Dev Commands
```sh
cd portal

# Install dependencies
npm ci

# Dev server (port 5173, proxies /api/ to localhost:8000)
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

### Environment Variables (Portal)
Injected at container start by `entrypoint.sh` into the built JS bundle:
- `VITE_API_URL` — backend base URL (empty = same origin via nginx proxy)
- `VITE_APP_NAME` — portal heading
- `VITE_APP_TAGLINE` — subheading on login screen
- `VITE_POLICY_TEXT` — policy notice text
- `VITE_DEFAULT_REDIRECT` — post-login redirect URL
- `VITE_TOKEN_KEY` — localStorage key for auth token

Dev overrides live in `portal/.env.local`.

---

## Infrastructure

| Item | Detail |
|------|--------|
| Orchestration | Docker Compose (bridge network `forte`) |
| Firewall | nftables (`inet` table, MAC address set with TTL) |
| Router OS | OpenWRT (production target) |
| Test rig | Docker-based OpenWRT simulation in `infra/openwrt/simulate/` |
| CI/CD | GitHub Actions (`.github/workflows/publish.yml`) — publishes images to GHCR |
| Image registry | `ghcr.io/cloudquestor/forte-backend` / `forte-portal` |

### Full Stack Dev Commands
```sh
# Start full stack (uses published images)
docker compose up -d

# View logs
docker compose logs -f

# Rebuild and start with local changes
docker compose up -d --build

# Stop
docker compose down
```

### OpenWRT Simulation
```sh
cd infra/openwrt/simulate
./start.sh    # spin up simulated router
./stop.sh     # tear down
```
