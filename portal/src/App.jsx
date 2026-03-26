import { useState } from 'react'
import LoginScreen from './LoginScreen'
import AdminScreen from './AdminScreen'

const isAdminMode = window.location.pathname.startsWith('/admin')

export default function App() {
  const [token, setToken] = useState(null)

  if (isAdminMode) {
    if (token) return <AdminScreen token={token} onLogout={() => setToken(null)} />
    return <LoginScreen adminMode onLogin={setToken} />
  }

  return <LoginScreen onLogin={null} />
}
