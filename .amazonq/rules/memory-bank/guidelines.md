# Forte — Development Guidelines

## Backend (Python / FastAPI)

### Module Structure
- One module per concern: `main.py` (routes), `auth.py` (auth logic), `db.py` (persistence), `firewall.py` (nftables), `omada.py` (Omada client), `otp.py` (OTP), `config.py` (env vars), `log.py` (logging)
- No circular imports — `main.py` imports all modules; modules import only `config`, `db`, `log`
- Module-level logger: `logger = log.get("module_name")` in every module

### Route Conventions
- All routes are in `main.py` — no routers/blueprints
- URL prefix: `/api/` for all API endpoints, `/health` for healthcheck
- Pydantic `BaseModel` for every request body; optional fields use `str | None = None`
- Admin guard: call `_require_admin(authorization)` at the top of every admin route
- Return plain dicts — no response model classes
- Use `status_code=201` on POST routes that create resources
- Raise `HTTPException` with appropriate status codes: 400 (bad input), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 422 (validation), 500 (upstream error)

```python
# Standard admin route pattern
@app.get("/api/resource")
def get_resource(authorization: str = Header(...)):
    _require_admin(authorization)
    return db.get_resource()

# Standard create route pattern
@app.post("/api/resource", status_code=201)
def create_resource(body: CreateResourceRequest, authorization: str = Header(...)):
    _require_admin(authorization)
    if db.resource_exists(body.name):
        raise HTTPException(status_code=409, detail="Resource already exists")
    db.create_resource(body.name)
    return {"name": body.name}
```

### Database (db.py)
- SQLite via `sqlite3` stdlib — no ORM
- `get_conn()` returns a connection with `row_factory = sqlite3.Row`; always use as context manager (`with get_conn() as conn`)
- Return `bool` from mutating functions by checking `cur.rowcount > 0`
- Return `dict(row)` or `[dict(r) for r in rows]` — never return raw Row objects
- Use `ON CONFLICT ... DO UPDATE` for upserts
- Schema migrations: check `PRAGMA table_info` before `ALTER TABLE`

```python
# Standard query pattern
def find_thing(key: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT ... FROM things WHERE key = ?", (key,)).fetchone()
    return dict(row) if row else None

# Standard mutate pattern
def delete_thing(key: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM things WHERE key = ?", (key,))
    return cur.rowcount > 0
```

### Config (config.py)
- All config is read from `os.getenv()` at module load time — no lazy loading
- Use module-level constants in UPPER_SNAKE_CASE
- Boolean flags: `os.getenv("VAR", "").lower() in ("1", "true", "yes")`
- List values: split on comma, strip whitespace, filter empty strings
- Fail fast for required vars: raise `RuntimeError` if missing

### Logging
- Use `logger.debug(...)` for all operational logging — no `print()`
- Log format: `"function_name: key=value key2=value2"` — structured key=value pairs
- Log at entry and exit of significant operations, and on every error branch

### External Integrations (omada.py pattern)
- Module-level `_session` and `_csrf_token` globals for connection reuse
- `OMADA_ENABLED` guard at top of every public function — return/skip silently if disabled
- Retry pattern: catch stale session → `_reset()` → re-login → retry once
- All HTTP calls use `timeout=10`, `verify=False` (self-signed certs)
- Wrap `requests.RequestException` → `HTTPException(status_code=500, ...)`
- Non-zero `errorCode` in response body = API-level failure, raise `HTTPException`

---

## Frontend (React / JSX)

### Component Conventions
- Default export for screen-level components; named exports for reusable primitives
- Small helper components (Avatar, StatCard, TopBar, Field) defined in the same file as the screen that uses them — only extract to `loginComponents.jsx` when shared across screens
- No prop-types; rely on JSDoc or inline defaults
- Tailwind only — no inline styles, no CSS modules

### State Management
- `useState` for all local state; no global state library
- State variables grouped at top of component with aligned declarations:
  ```js
  const [view, setView]   = useState('dashboard')
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  ```
- Setter shorthand for form fields: `const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))`
- `useCallback` for fetch functions that are deps of `useEffect`

### Error Handling Pattern
- Every async handler: `setError(''); setBusy(true)` → try/catch → `setError(err.message)` → finally `setBusy(false)`
- Error display: `{error && <p className="text-red-500 text-xs">{error}</p>}`
- Success display: `{success && <p className="text-green-600 text-xs">{success}</p>}`

### Multi-Step Flow Pattern (ForgotScreen / LoginScreen)
- `step` state string controls which form renders: `'mobile' | 'otp' | 'reset'`
- Each step is a separate `if (step === '...')` return block — not conditional rendering within one JSX tree
- MSG91 integration is always gated: `const useMsg91 = isEnabled()` → branch on it

### API Layer (api.js)
- All `fetch()` calls live in `api.js` — screens never call `fetch()` directly
- Every function: check `res.ok`, extract `detail` from JSON body, throw `new Error(detail)`
- Fallback error message in `.catch(() => ({ detail: 'Fallback message' }))` on `res.json()`
- Auth header: `Authorization: \`Bearer ${token}\``
- Omada params always passed as an `omadaParams` object with camelCase keys; mapped to snake_case in the request body

```js
// Standard API function pattern
export async function doThing(token, data) {
  const res = await fetch(`${config.apiUrl}/api/thing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Operation failed' }))
    throw new Error(detail)
  }
  return res.json()
}
```

### Routing
- No React Router — `window.location.pathname` checked once at module level in `App.jsx`
- Path-based screen switching with `if (path.startsWith('/...'))` guards

### Tailwind Conventions
- Brand color: `brand-600` for primary buttons, `brand-700` for hover
- Admin UI uses `blue-600` / `blue-700` (distinct from portal brand color)
- Rounded corners: `rounded-xl` for inputs/buttons, `rounded-2xl` for cards
- Input focus ring: `focus:outline-none focus:ring-2 focus:ring-brand-500` (portal) or `focus:ring-blue-500` (admin)
- Disabled state: `disabled:opacity-50` or `disabled:opacity-60`
- Transition: `transition-colors` on interactive elements

### Runtime Config
- Never hardcode configurable strings — always read from `config.js`
- `config.js` reads `window.__FORTE_CONFIG__` with `??` fallback defaults
- New config values must be added to: `entrypoint.sh` (injection), `config.js` (read + default), `docker-compose.yml` (env var), and `README.md` (docs)
