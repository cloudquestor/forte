# Forte — Development Guidelines

## Code Quality Standards

### Python (Backend)
- Python 3.12 — use modern union syntax (`str | None`) not `Optional[str]`
- No type annotations on local variables; annotate function signatures only where it aids clarity
- No docstrings; code is self-documenting through clear naming
- Flat module structure — no packages, no subdirectories; each concern is one file (`auth.py`, `db.py`, `firewall.py`, `config.py`)
- Keep functions short and single-purpose; no classes except Pydantic models

### JavaScript (Portal)
- ES modules (`"type": "module"` in package.json), JSX with React 18
- No TypeScript — plain `.js` / `.jsx` throughout
- No router library — path-based routing via `window.location.pathname` in `App.jsx`
- No state management library — React `useState` / `useEffect` / `useCallback` only
- No comments in code; names convey intent

---

## Naming Conventions

### Python
- `snake_case` for all functions, variables, module-level constants use `UPPER_SNAKE_CASE`
- Pydantic request models: `<Action><Resource>Request` (e.g. `CreateUserRequest`, `LoginRequest`)
- Private helpers prefixed with `_` (e.g. `_require_admin`, `_validate_mac`, `_run`, `_seed_users`)
- DB functions named after their SQL operation: `create_user`, `delete_user`, `list_users`, `update_password`, `user_exists`

### JavaScript
- `camelCase` for functions and variables; `PascalCase` for React components
- API functions named after HTTP semantics: `login`, `logout`, `listUsers`, `createUser`, `updateUser`, `deleteUser`, `updatePassword`, `getStats`
- Component files: `PascalCase.jsx` (e.g. `AdminScreen.jsx`, `LoginScreen.jsx`)
- Small reusable UI pieces defined as local functions in the same file (e.g. `Avatar`, `Field`, `StatCard`, `TopBar` in `AdminScreen.jsx`)

---

## Architectural Patterns

### Backend
- **Thin routes, logic in modules**: `main.py` routes delegate immediately to `auth.py` or `db.py`
- **Admin guard as a helper**: `_require_admin(authorization)` called at the top of every admin route — raises 403 if not admin
- **No ORM**: raw `sqlite3` with `conn.row_factory = sqlite3.Row`; results converted with `dict(r)`
- **Context manager for DB**: every DB function opens and closes its own connection via `with get_conn() as conn:`
- **Firewall as a side effect**: `firewall.allow(mac)` / `firewall.revoke(mac)` called from `auth.py`, never from routes directly
- **Config as module-level constants**: `config.py` parses env vars once at import time into typed module-level names

### Frontend
- **All API calls in `api.js`**: no `fetch` calls outside this file; every function follows the same pattern:
  ```js
  const res = await fetch(`${config.apiUrl}/api/...`, { ... })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Fallback message' }))
    throw new Error(detail)
  }
  return res.json()
  ```
- **Runtime config via `window.__FORTE_CONFIG__`**: `config.js` reads from a global injected by `entrypoint.sh`, with hardcoded defaults as fallback
- **View state machine in AdminScreen**: single `view` state (`'dashboard' | 'users' | 'form'`) drives which JSX block renders — no separate route/page components
- **Form state pattern**: `EMPTY_FORM` constant + `set(key)(val)` curried setter: `const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))`
- **Busy/error/success state trio**: every async action uses `[busy, setBusy]`, `[error, setError]`, `[success, setSuccess]`

---

## API Patterns

### Error responses (Backend)
Always use `HTTPException` with a `detail` string:
```python
raise HTTPException(status_code=401, detail="Invalid credentials")
raise HTTPException(status_code=403, detail="Admin access required")
raise HTTPException(status_code=404, detail="User not found")
raise HTTPException(status_code=409, detail="User already exists")
```

### Auth header convention
Token passed as `Authorization: Bearer <token>` header. Backend extracts with:
```python
token = authorization.removeprefix("Bearer ").strip()
```

### Success responses (Backend)
Simple dicts — no envelope wrapper:
```python
return {"access_token": token, "token_type": "bearer"}   # login
return {"status": "logged out"}                           # logout
return {"status": "updated"}                              # update
return {"status": "deleted"}                              # delete
return {"username": body.username}                        # create (201)
```

---

## Database Patterns

- Schema created in `init()` via `executescript` with `CREATE TABLE IF NOT EXISTS`
- Inline migrations: check `PRAGMA table_info(users)` for missing columns, then `ALTER TABLE ... ADD COLUMN`
- Parameterised queries always — never string interpolation in SQL (except `ALTER TABLE` DDL with safe constant strings)
- `pop_session(token)` atomically reads MAC then deletes session in one connection context
- Passwords always stored as bcrypt hashes; `hash_password` / `_check_password` are the only two places that touch bcrypt

---

## Firewall Patterns

- `firewall.py` is the only file that calls `subprocess`
- Command construction: prepend `["docker", "exec", config.ROUTER_CONTAINER, "nft"]` when `ROUTER_CONTAINER` is set, else `["nft"]`
- `FileNotFoundError` is silently swallowed (dev environment without `nft`)
- `CalledProcessError` raises HTTP 500 with stderr as detail
- MAC TTL is always `config.SESSION_TTL` — no per-session TTL override

---

## Styling (Portal)

- Tailwind CSS utility classes only — no custom CSS files beyond `index.css` (base reset) and `App.css` (minimal)
- Consistent border radius: `rounded-xl` for inputs/buttons, `rounded-2xl` for cards
- Color palette: `blue-600` primary, `gray-50/100/200/400/500/800/900` neutrals, `red-500` errors, `green-600` success
- Focus ring: `focus:outline-none focus:ring-2 focus:ring-blue-500` on all inputs
- Disabled state: `disabled:opacity-60` on submit buttons
- Transition: `transition-colors` on interactive elements

---

## Docker / Deployment Patterns

- Backend runs as non-root user `forte` (uid 1001)
- Portal uses multi-stage build: Node 18-Alpine builder → Nginx 1.25-Alpine server
- `entrypoint.sh` injects runtime env vars into the built bundle before nginx starts (enables runtime config without rebuild)
- Health check on backend: Python one-liner hitting `/health` via `urllib.request`
- Portal depends on backend `service_healthy` condition in compose
- Persistent data volume `forte-data` mounted at `/data` in backend container
- All config via environment variables — no config files committed with secrets
