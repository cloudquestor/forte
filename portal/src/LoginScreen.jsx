import { useState } from 'react'
import { login } from './api'
import config from './config'
import { getRedirectUrl, getMacAddress, getOmadaParams } from './loginUtils'
import { Logo, Field, SubmitBtn, inputCls } from './loginComponents'
import OtpForm from './OtpForm'
import PasswordForm from './PasswordForm'
import SignupForm from './SignupForm'
import ForgotScreen from './ForgotScreen'

function Tabs({ active, onChange }) {
  const tabs = [
    { id: 'otp',      label: '📱 Mobile / OTP' },
    { id: 'password', label: '🔑 Username / Password' },
  ]
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
      {tabs.map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  active === t.id ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function LoginScreen({ adminMode, onLogin }) {
  const [tab, setTab]                       = useState('otp')
  const [screen, setScreen]                 = useState('login')
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [error, setError]                   = useState('')
  const [busy, setBusy]                     = useState(false)

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    const f = e.target
    setError(''); setBusy(true)
    try {
      const { access_token } = await login(f.username.value, f.password.value, null, null, true)
      onLogin(access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleUserSuccess = (token) => {
    sessionStorage.setItem(config.tokenKey, token)
    window.location.href = getRedirectUrl() || config.defaultRedirect
  }

  const goBack = () => { setScreen('login'); setPolicyAccepted(false) }

  if (adminMode) return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <Logo />
        <p className="text-center text-sm text-gray-500 mb-5">Admin Sign In</p>
        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <Field label="Username">
            <input name="username" type="text" required autoComplete="username" className={inputCls} placeholder="Admin username" />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required autoComplete="current-password" className={inputCls} placeholder="Password" />
          </Field>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <SubmitBtn busy={busy} disabled={false} label="Sign In" busyLabel="Signing in…" />
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <Logo />

        {screen === 'signup' && <SignupForm onBack={goBack} />}

        {screen === 'forgot' && <ForgotScreen onBack={goBack} />}

        {screen === 'login' && (
          <>
            <Tabs active={tab} onChange={(t) => { setTab(t); setPolicyAccepted(false) }} />
            {tab === 'otp'
              ? <OtpForm onSuccess={handleUserSuccess} policyAccepted={policyAccepted} setPolicyAccepted={setPolicyAccepted} />
              : <PasswordForm onSuccess={handleUserSuccess} policyAccepted={policyAccepted} setPolicyAccepted={setPolicyAccepted}
                              onSignup={() => setScreen('signup')} onForgot={() => setScreen('forgot')} />
            }
          </>
        )}
      </div>
    </div>
  )
}
