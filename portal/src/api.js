const BASE = import.meta.env.VITE_API_URL ?? ''

export async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(detail)
  }
  return res.json()   // { access_token, token_type }
}
