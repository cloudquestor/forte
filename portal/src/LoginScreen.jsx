import { useState, useEffect, useRef } from 'react'
import { login, requestOtp, verifyOtp, signupRequestOtp, signupVerifyAndCreate, resetPasswordRequestOtp, resetPassword } from './api'
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
  const link = (
    <a href={url} target="_blank" rel="noreferrer"
       className="text-brand-600 underline hover:text-brand-800 transition-colors">
      network usage policy
    </a>
  )
  return after !== undefined ? <>{before}{link}{after}</> : <>{text}</>
}

function isValidMobile(v) { return /^\d{10}$/.test(v) }

function Logo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <img src="/logo.png" alt={config.appName} className="h-16 object-contain mb-3"
           onError={(e) => { e.target.style.display = 'none' }} />
      <p className="text-sm text-gray-500">{config.appTagline}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

function MobileInput({ value, onChange, placeholder = '10-digit mobile number' }) {
  return (
    <input
      type="tel" required inputMode="numeric" maxLength={10}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
      className={inputCls}
      placeholder={placeholder}
    />
  )
}

function OtpInput({ value, onChange }) {
  return (
    <input
      type="text" required inputMode="numeric" maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className={`${inputCls} tracking-widest text-center`}
      placeholder="······"
      autoFocus
    />
  )
}

function PolicyCheckbox({ accepted, onChange }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={accepted} onChange={(e) => onChange(e.target.checked)}
             className="mt-0.5 accent-brand-600" />
      <span className="text-xs text-gray-500">
        {renderPolicyText(config.policyText, config.policyUrl)}
      </span>
    </label>
  )
}

function SubmitBtn({ busy, disabled, label, busyLabel }) {
  return (
    <button type="submit" disabled={busy || disabled}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2 rounded-xl text-sm transition-colors">
      {busy ? busyLabel : label}
    </button>
  )
}

function BackBtn({ onClick, label = '← Back' }) {
  return (
    <button type="button" onClick={onClick}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
      {label}
    </button>
  )
}

// ── MSG91 widget loader ──────────────────────────────────────────────────

let msg91ScriptReady = false
let msg91ScriptLoading = null
let msg91Initialized = false

function loadMsg91Script() {
  if (msg91ScriptReady) return Promise.resolve()
  if (msg91ScriptLoading) return msg91ScriptLoading
  msg91ScriptLoading = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://verify.msg91.com/otp-provider.js'
    s.onload = () => { msg91ScriptReady = true; resolve() }
    document.head.appendChild(s)
  })
  return msg91ScriptLoading
}

// ── OTP login ────────────────────────────────────────────────────────────────

function OtpForm({ onSuccess, policyAccepted, setPolicyAccepted }) {
  const [mobile, setMobile] = useState('')
  const [code, setCode]     = useState('')
  const [step, setStep]     = useState('mobile')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const useMsg91 = !!(config.msg91WidgetId && config.msg91TokenAuth)
  const policyRef = useRef(policyAccepted)
  const mobileRef = useRef(mobile)
  const onSuccessRef = useRef(null)
  const onFailureRef = useRef(null)
  useEffect(() => { policyRef.current = policyAccepted }, [policyAccepted])
  useEffect(() => { mobileRef.current = mobile }, [mobile])

  useEffect(() => {
    if (!useMsg91) return
    onSuccessRef.current = async (data) => {
      setBusy(true)
      try {
        const token = data.message ?? data['access-token']
        const { access_token } = await verifyOtp(mobileRef.current, token, getMacAddress(), getOmadaParams(), policyRef.current, true)
        onSuccess(access_token)
      } catch (err) {
        setError(err.message)
        setBusy(false)
      }
    }
    onFailureRef.current = (err) => { setError(err.message || 'OTP verification failed'); setBusy(false) }
    // Set globals so signup/forgot screens can also receive callbacks
    window.__msg91Success = (data) => onSuccessRef.current?.(data)
    window.__msg91Failure = (err)  => onFailureRef.current?.(err)

    if (msg91Initialized) return
    msg91Initialized = true
    loadMsg91Script().then(() => {
      if (window.initSendOTP) {
        window.initSendOTP({
          widgetId:        config.msg91WidgetId,
          tokenAuth:       config.msg91TokenAuth,
          exposeMethods:   true,
          captchaRenderId: 'msg91-captcha',
          success: (data) => window.__msg91Success?.(data),
          failure: (err)  => window.__msg91Failure?.(err),
        })
      }
    })
  }, [useMsg91])

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!isValidMobile(mobile)) { setError('Enter a valid 10-digit mobile number'); return }
    setError(''); setBusy(true)
    try {
      if (useMsg91) {
        window.sendOtp(`91${mobile}`)
        setStep('code')
      } else {
        await requestOtp(mobile)
        setStep('code')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    if (useMsg91) {
      window.verifyOtp(code)
      // busy stays true — success/failure callbacks handle outcome
    } else {
      verifyOtp(mobile, code, getMacAddress(), getOmadaParams(), policyAccepted)
        .then(({ access_token }) => onSuccess(access_token))
        .catch(err => { setError(err.message); setBusy(false) })
    }
  }

  if (step === 'mobile') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <Field label="Mobile Number">
          <MobileInput value={mobile} onChange={setMobile} />
        </Field>
        <div id="msg91-captcha" />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
        <SubmitBtn busy={busy} disabled={!policyAccepted || mobile.length !== 10} label="Send OTP" busyLabel="Sending…" />
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <p className="text-sm text-gray-500">OTP sent to <span className="font-medium text-gray-700">{mobile}</span></p>
      <Field label="Enter OTP">
        <OtpInput value={code} onChange={setCode} />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <SubmitBtn busy={busy} disabled={!policyAccepted || code.length !== 6} label="Verify & Sign In" busyLabel="Verifying…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={() => useMsg91 ? window.retryOtp() : requestOtp(mobile).catch(() => {})}
                className="text-brand-600 hover:text-brand-800 transition-colors">Resend OTP</button>
        <BackBtn onClick={() => { setStep('mobile'); setCode(''); setError('') }} label="← Change number" />
      </div>
    </form>
  )
}

// ── Password login ───────────────────────────────────────────────────────────

function PasswordForm({ onSuccess, policyAccepted, setPolicyAccepted, onSignup, onForgot }) {
  const [mobile, setMobile]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidMobile(mobile)) { setError('Enter a valid 10-digit mobile number'); return }
    setError('')
    setBusy(true)
    try {
      const { access_token } = await login(mobile, password, getMacAddress(), getOmadaParams(), policyAccepted)
      onSuccess(access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Username">
        <MobileInput value={mobile} onChange={setMobile} placeholder="Your 10-digit mobile number" />
        <p className="text-xs text-gray-400 mt-1">Your username is the mobile number you registered with</p>
      </Field>
      <Field label="Password">
        <input type="password" required autoComplete="current-password" value={password}
               onChange={(e) => setPassword(e.target.value)}
               className={inputCls} placeholder="Enter your password" />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <SubmitBtn busy={busy} disabled={!policyAccepted || mobile.length !== 10} label="Sign In" busyLabel="Signing in…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={onForgot}
                className="text-brand-600 hover:text-brand-800 transition-colors">
          Forgot password?
        </button>
        <button type="button" onClick={onSignup}
                className="text-brand-600 hover:text-brand-800 transition-colors">
          Create account
        </button>
      </div>
    </form>
  )
}

// ── Signup (OTP-verified, mobile = username) ─────────────────────────────────

const EMPTY_SIGNUP = { mobile: '', code: '', msg91Token: '', password: '', confirm: '' }

function SignupForm({ onBack }) {
  const [form, setForm]       = useState(EMPTY_SIGNUP)
  const [step, setStep]       = useState('mobile')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [success, setSuccess] = useState(false)
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  const setE = (k) => (e) => set(k)(e.target.value)
  const useMsg91 = !!(config.msg91WidgetId && config.msg91TokenAuth)

  useEffect(() => {
    if (!useMsg91) return
    // Update the global callbacks so the single widget instance routes to this form
    window.__msg91Success = (data) => { set('msg91Token')(data.message ?? data['access-token']); setStep('details') }
    window.__msg91Failure = (err) => { setError(err.message || 'OTP verification failed'); setBusy(false) }
    return () => { window.__msg91Success = null; window.__msg91Failure = null }
  }, [useMsg91])

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (!isValidMobile(form.mobile)) { setError('Enter a valid 10-digit mobile number'); return }
    setError(''); setBusy(true)
    try {
      if (useMsg91) {
        window.sendOtp(`91${form.mobile}`)
        setStep('otp')
      } else {
        await signupRequestOtp(form.mobile)
        setStep('otp')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (form.code.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setError('')
    if (useMsg91) {
      setBusy(true)
      window.verifyOtp(form.code)
      // busy stays true — success/failure callbacks handle outcome
    } else {
      setStep('details')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setError('')
    setBusy(true)
    try {
      await signupVerifyAndCreate({
        mobile:     form.mobile,
        msg91Token: form.msg91Token || null,
        code:       form.code || null,
        password:   form.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-green-600 text-4xl">✓</div>
        <p className="text-sm font-medium text-gray-700">Account created!</p>
        <p className="text-xs text-gray-500">Sign in with your mobile number and password.</p>
        <button type="button" onClick={onBack}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">
          Back to Sign In
        </button>
      </div>
    )
  }

  if (step === 'mobile') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <p className="text-xs text-gray-500 text-center">We'll send an OTP to verify your number</p>
        <Field label="Mobile Number">
          <MobileInput value={form.mobile} onChange={set('mobile')} />
        </Field>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <SubmitBtn busy={busy} disabled={form.mobile.length !== 10} label="Send OTP" busyLabel="Sending…" />
        <BackBtn onClick={onBack} />
      </form>
    )
  }

  if (step === 'otp') {
    if (useMsg91) {
      return (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-gray-500">OTP sent to <span className="font-medium text-gray-700">{form.mobile}</span></p>
          <Field label="Enter OTP">
            <OtpInput value={form.code} onChange={set('code')} />
          </Field>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <SubmitBtn busy={busy} disabled={form.code.length !== 6} label="Verify OTP" busyLabel="Verifying…" />
          <div className="flex justify-between text-xs pt-1">
            <button type="button" onClick={() => window.retryOtp()}
                    className="text-brand-600 hover:text-brand-800 transition-colors">Resend OTP</button>
            <BackBtn onClick={() => { setStep('mobile'); setError('') }} label="← Change number" />
          </div>
        </form>
      )
    }
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <p className="text-sm text-gray-500">OTP sent to <span className="font-medium text-gray-700">{form.mobile}</span></p>
        <Field label="Enter OTP">
          <OtpInput value={form.code} onChange={set('code')} />
        </Field>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <SubmitBtn busy={false} disabled={form.code.length !== 6} label="Verify OTP" busyLabel="Verifying…" />
        <BackBtn onClick={() => { setStep('mobile'); setError('') }} label="← Change number" />
      </form>
    )
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <p className="text-xs text-gray-500 text-center">Choose a password for your account</p>
      <Field label="Password">
        <input type="password" required autoComplete="new-password" value={form.password} onChange={setE('password')} className={inputCls} placeholder="Choose a password" />
      </Field>
      <Field label="Confirm Password">
        <input type="password" required autoComplete="new-password" value={form.confirm} onChange={setE('confirm')} className={inputCls} placeholder="Repeat password" />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={false} label="Create Account" busyLabel="Creating…" />
    </form>
  )
}

// ── Forgot password ──────────────────────────────────────────────────────────

function ForgotScreen({ onBack }) {
  const [mobile, setMobile]         = useState('')
  const [code, setCode]             = useState('')
  const [msg91Token, setMsg91Token] = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [step, setStep]             = useState('mobile')
  const [error, setError]           = useState('')
  const [busy, setBusy]             = useState(false)
  const [success, setSuccess]       = useState(false)
  const useMsg91 = !!(config.msg91WidgetId && config.msg91TokenAuth)

  useEffect(() => {
    if (!useMsg91) return
    window.__msg91Success = (data) => { setMsg91Token(data.message ?? data['access-token']); setStep('reset') }
    window.__msg91Failure = (err) => { setError(err.message || 'OTP verification failed'); setBusy(false) }
    return () => { window.__msg91Success = null; window.__msg91Failure = null }
  }, [useMsg91])

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!isValidMobile(mobile)) { setError('Enter a valid 10-digit mobile number'); return }
    setError(''); setBusy(true)
    try {
      if (useMsg91) {
        window.sendOtp(`91${mobile}`)
        setStep('otp')
      } else {
        await resetPasswordRequestOtp(mobile)
        setStep('otp')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setError('')
    if (useMsg91) {
      setBusy(true)
      window.verifyOtp(code)
      // busy stays true — success/failure callbacks handle outcome
    } else {
      setStep('reset')
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setBusy(true)
    try {
      await resetPassword(mobile, msg91Token || code, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-green-600 text-4xl">✓</div>
        <p className="text-sm font-medium text-gray-700">Password reset!</p>
        <p className="text-xs text-gray-500">Sign in with your new password.</p>
        <button type="button" onClick={onBack}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">
          Back to Sign In
        </button>
      </div>
    )
  }

  if (step === 'mobile') {
    return (
      <form onSubmit={handleLookup} className="space-y-4">
        <p className="text-xs text-gray-500 text-center">Enter your registered mobile number</p>
        <Field label="Mobile Number">
          <MobileInput value={mobile} onChange={setMobile} />
        </Field>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <SubmitBtn busy={busy} disabled={mobile.length !== 10} label="Find Account" busyLabel="Looking up…" />
        <BackBtn onClick={onBack} />
      </form>
    )
  }

  if (step === 'otp') {
    if (useMsg91) {
      return (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-gray-500 text-center">OTP sent to <span className="font-medium text-gray-700">{mobile}</span></p>
          <Field label="Enter OTP">
            <OtpInput value={code} onChange={setCode} />
          </Field>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <SubmitBtn busy={false} disabled={code.length !== 6} label="Verify OTP" busyLabel="Verifying…" />
          <div className="flex justify-between text-xs pt-1">
            <button type="button" onClick={() => window.retryOtp()}
                    className="text-brand-600 hover:text-brand-800 transition-colors">Resend OTP</button>
            <BackBtn onClick={() => { setStep('mobile'); setError('') }} label="← Change number" />
          </div>
        </form>
      )
    }
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <p className="text-sm text-gray-500 text-center">OTP sent to <span className="font-medium text-gray-700">{mobile}</span></p>
        <Field label="Enter OTP">
          <OtpInput value={code} onChange={setCode} />
        </Field>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <SubmitBtn busy={false} disabled={code.length !== 6} label="Verify OTP" busyLabel="Verifying…" />
        <BackBtn onClick={() => { setStep('mobile'); setError('') }} label="← Change number" />
      </form>
    )
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <p className="text-xs text-gray-500 text-center">Set a new password</p>
      <Field label="New Password">
        <input type="password" required autoComplete="new-password" value={password}
               onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="New password" />
      </Field>
      <Field label="Confirm Password">
        <input type="password" required autoComplete="new-password" value={confirm}
               onChange={(e) => setConfirm(e.target.value)} className={inputCls} placeholder="Repeat password" />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={false} label="Reset Password" busyLabel="Resetting…" />
    </form>
  )
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

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

// ── Root ─────────────────────────────────────────────────────────────────────

export default function LoginScreen({ adminMode, onLogin }) {
  const [tab, setTab]                       = useState('otp')
  const [screen, setScreen]                 = useState('login')
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [error, setError]                   = useState('')
  const [busy, setBusy]                     = useState(false)

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    const f = e.target
    setError('')
    setBusy(true)
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
    window.location.href = getRedirectUrl()
  }

  if (adminMode) {
    return (
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
  }

  const goBack = () => { setScreen('login'); setPolicyAccepted(false) }

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
