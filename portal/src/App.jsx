import { useState } from 'react'
import LoginScreen from './LoginScreen'
import AdminScreen from './AdminScreen'
import StatusScreen from './StatusScreen'
import PolicyScreen from './PolicyScreen'

const path = window.location.pathname

export default function App() {
  const [token, setToken] = useState(null)

  if (path.startsWith('/status')) return <StatusScreen />
  if (path.startsWith('/policy')) return <PolicyScreen />

  if (path.startsWith('/admin')) {
    if (token) return <AdminScreen token={token} onLogout={() => setToken(null)} />
    return <LoginScreen adminMode onLogin={setToken} />
  }

  return <LoginScreen onLogin={null} />
}
