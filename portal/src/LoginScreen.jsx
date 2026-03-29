import { useState } from 'react'
import { login, requestOtp, verifyOtp } from './api'
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

function Tab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}

function PolicyCheckbox({ accepted, onChange }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-blue-600"
      />
      <span className="text-xs text-gray-500">
        {renderPolicyText(config.policyText, config.policyUrl)}
      </span>
    </label>
  )
}

function PasswordForm({ onSuccess, policyAccepted, setPolicyAccepted }) {
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { access_token } = await login(
        form.username, form.password,
        getMacAddress(), getOmadaParams(), policyAccepted,
      )
      onSuccess(access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          type="text"
          required
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your password"
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <button
        type="submit"
        disabled={busy || !policyAccepted}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-xl text-sm transition-colors"
      >
        {busy ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

function OtpForm({ onSuccess, policyAccepted, setPolicyAccepted }) {
  const [mobile, setMobile] = useState('')
  const [code, setCode]     = useState('')
  const [step, setStep]     = useState('mobile')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await requestOtp(mobile)
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { access_token } = await verifyOtp(
        mobile, code, getMacAddress(), getOmadaParams(), policyAccepted,
      )
      onSuccess(access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'mobile') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
          <input
            type="tel"
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 919876543210"
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
        <button
          type="submit"
          disabled={busy || !policyAccepted}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-xl text-sm transition-colors"
        >
          {busy ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <p className="text-sm text-gray-500">OTP sent to <span className="font-medium text-gray-700">{mobile}</span></p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
        <input
          type="text"
          required
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center"
          placeholder="······"
          autoFocus
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <button
        type="submit"
        disabled={busy || !policyAccepted}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-xl text-sm transition-colors"
      >
        {busy ? 'Verifying…' : 'Verify OTP'}
      </button>
      <button
        type="button"
        onClick={() => { setStep('mobile'); setCode(''); setError('') }}
        className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Change number
      </button>
    </form>
  )
}

export default function LoginScreen({ adminMode, onLogin }) {
  const [tab, setTab]                       = useState('password')
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [error, setError]                   = useState('')
  const [busy, setBusy]                     = useState(false)

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    const form = e.target
    setError('')
    setBusy(true)
    try {
      const { access_token } = await login(
        form.username.value, form.password.value, null, null, true,
      )
      onLogin(access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleUserSuccess = (token) => {
    sessionStorage.setItem(config.tokenKey, token)
    window.location.href = getRedirectUrl()
  }

  if (adminMode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800">{config.appName}</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Sign In</p>
          </div>
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-xl text-sm transition-colors"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">{config.appName}</h1>
          <p className="text-sm text-gray-500 mt-1">{config.appTagline}</p>
        </div>

        {tab === 'password'
              ? <PasswordForm onSuccess={handleUserSuccess} policyAccepted={policyAccepted} setPolicyAccepted={setPolicyAccepted} />
              : <OtpForm onSuccess={handleUserSuccess} policyAccepted={policyAccepted} setPolicyAccepted={setPolicyAccepted} />
            }
            <p className="text-center text-xs text-gray-400 mt-4">
              {tab === 'password' ? (
                <>Don't have a user account?{' '}
                  <button type="button" onClick={() => setTab('otp')} className="text-blue-600 underline hover:text-blue-800 transition-colors">
                    Sign in with OTP
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setTab('password')} className="text-blue-600 underline hover:text-blue-800 transition-colors">
                  ← Back to password login
                </button>
              )}
            </p>
      </div>
    </div>
  )
}
