import { useState } from 'react'
import { login } from './api'
import config from './config'

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirectUrl') || params.get('redirect') || config.defaultRedirect
}

function getMacAddress() {
  const params = new URLSearchParams(window.location.search)
  return params.get('clientMac') || params.get('mac') || null
}

function getOmadaParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    apMac:      p.get('apMac'),
    ssidName:   p.get('ssidName'),
    radioId:    p.get('radioId'),
    gatewayMac: p.get('gatewayMac'),
    vid:        p.get('vid'),
  }
}

function renderPolicyText(text, url) {
  const [before, after] = text.split('[[policy]]')
  const link = <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800 transition-colors">network usage policy</a>
  return after !== undefined ? <>{before}{link}{after}</> : <>{text}</>
}

export default function LoginScreen({ adminMode, onLogin }) {
  const [form, setForm]             = useState({ username: '', password: '' })
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await login(
        form.username, form.password,
        adminMode ? null : getMacAddress(),
        adminMode ? null : getOmadaParams(),
        adminMode ? true : policyAccepted,
      )
      if (adminMode) {
        onLogin(access_token)
      } else {
        sessionStorage.setItem(config.tokenKey, access_token)
        window.location.href = getRedirectUrl()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">{config.appName}</h1>
          <p className="text-sm text-gray-500 mt-1">{config.appTagline}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          {!adminMode && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span className="text-xs text-gray-500">
                {renderPolicyText(config.policyText, config.policyUrl)}
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (!adminMode && !policyAccepted)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>


      </div>
    </div>
  )
}
