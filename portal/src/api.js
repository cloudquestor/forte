import config from './config'

export async function login(username, password, macAddress, omadaParams, policyAccepted = false) {
  const res = await fetch(`${config.apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      mac_address:     macAddress ?? null,
      ap_mac:          omadaParams?.apMac ?? null,
      ssid_name:       omadaParams?.ssidName ?? null,
      radio_id:        omadaParams?.radioId ?? null,
      gateway_mac:     omadaParams?.gatewayMac ?? null,
      vid:             omadaParams?.vid ?? null,
      policy_accepted: policyAccepted,
    }),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(detail)
  }
  return res.json()
}

export async function logout(token) {
  await fetch(`${config.apiUrl}/api/auth/logout`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getStats(token) {
  const res = await fetch(`${config.apiUrl}/api/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Failed to fetch stats' }))
    throw new Error(detail)
  }
  return res.json()
}

export async function listUsers(token) {
  const res = await fetch(`${config.apiUrl}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Failed to fetch users' }))
    throw new Error(detail)
  }
  return res.json()
}

export async function createUser(token, data) {
  const res = await fetch(`${config.apiUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Failed to create user' }))
    throw new Error(detail)
  }
  return res.json()
}

export async function updateUser(token, username, data) {
  const res = await fetch(`${config.apiUrl}/api/users/${encodeURIComponent(username)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Failed to update user' }))
    throw new Error(detail)
  }
  return res.json()
}

export async function updatePassword(token, username, password) {
  const res = await fetch(`${config.apiUrl}/api/users/${encodeURIComponent(username)}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Failed to update password' }))
    throw new Error(detail)
  }
  return res.json()
}

export async function deleteUser(token, username) {
  const res = await fetch(`${config.apiUrl}/api/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({ detail: 'Failed to delete user' }))
    throw new Error(detail)
  }
  return res.json()
}
