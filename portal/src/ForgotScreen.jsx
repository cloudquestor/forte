import { useState, useEffect, useRef } from 'react'
import { resetPasswordRequestOtp, resetPassword } from './api'
import { isEnabled, initWidget, moveCaptchaTo, sendOtp, verifyOtp as msg91Verify, retryOtp, extractToken } from './msg91'
import { Field, MobileInput, OtpInput, SubmitBtn, BackBtn } from './loginComponents'
import config from './config'

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function ForgotScreen({ onBack }) {
  const [mobile, setMobile]         = useState('')
  const [code, setCode]             = useState('')
  const [msg91Token, setMsg91Token] = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [step, setStep]             = useState('mobile')
  const [error, setError]           = useState('')
  const [busy, setBusy]             = useState(false)
  const [success, setSuccess]       = useState(false)
  const useMsg91 = isEnabled()
  const [resent, setResent]     = useState(false)
  const [cooldown, setCooldown] = useState(config.resendCooldown)
  const cooldownRef             = useRef(null)


  const startCooldown = () => {
    setCooldown(config.resendCooldown)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => setCooldown(c => {
      if (c <= 1) { clearInterval(cooldownRef.current); return 0 }
      return c - 1
    }), 1000)
  }

  useEffect(() => {
    if (step === 'otp') startCooldown()
    return () => clearInterval(cooldownRef.current)
  }, [step])

  useEffect(() => {
    if (!useMsg91) return
    window.__msg91Success = (data) => { setMsg91Token(extractToken(data)); setStep('reset'); setBusy(false) }
    window.__msg91Failure = (err) => { setError(err.message || 'OTP verification failed'); setBusy(false) }
    initWidget()
    moveCaptchaTo('msg91-captcha-slot')
    return () => { window.__msg91Success = null; window.__msg91Failure = null }
  }, [useMsg91])

  const handleLookup = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await resetPasswordRequestOtp(mobile)   // always check first — returns 404 if not registered
      if (useMsg91) { sendOtp(mobile) }
      setStep('otp')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const handleResend = async () => {
    setError(''); setResent(false); setBusy(true)
    try {
      if (useMsg91) { retryOtp() }
      else { await resetPasswordRequestOtp(mobile) }
      setResent(true)
      startCooldown()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setError('')
    if (useMsg91) { setBusy(true); msg91Verify(code) }
    else setStep('reset')
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(''); setBusy(true)
    try {
      await resetPassword(mobile, msg91Token || code, password)
      setSuccess(true)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  if (success) return (
    <div className="space-y-4 text-center">
      <div className="text-green-600 text-4xl">✓</div>
      <p className="text-sm font-medium text-gray-700">Password reset!</p>
      <p className="text-xs text-gray-500">Sign in with your new password.</p>
      <button type="button" onClick={onBack} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">Back to Sign In</button>
    </div>
  )

  if (step === 'mobile') return (
    <form onSubmit={handleLookup} className="space-y-4">
      <p className="text-xs text-gray-500 text-center">Enter your registered mobile number</p>
      <Field label="Mobile Number"><MobileInput value={mobile} onChange={setMobile} /></Field>
      <div id="msg91-captcha-slot" />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={mobile.length !== 10} label="Find Account" busyLabel="Looking up…" />
      <BackBtn onClick={onBack} />
    </form>
  )

  if (step === 'otp') return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <p className="text-sm text-gray-500 text-center">OTP sent to <span className="font-medium text-gray-700">{mobile}</span></p>
      <Field label="Enter OTP"><OtpInput value={code} onChange={setCode} /></Field>
      {error  && <p className="text-red-500 text-xs">{error}</p>}
      {resent && <p className="text-green-600 text-xs">OTP resent successfully.</p>}
      <SubmitBtn busy={busy} disabled={code.length !== 6} label="Verify OTP" busyLabel="Verifying…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={handleResend} disabled={busy || cooldown > 0}
                className="text-brand-600 hover:text-brand-800 disabled:opacity-50 transition-colors">
          {cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
        </button>
        <BackBtn onClick={() => { setStep('mobile'); setError(''); setResent(false) }} label="← Change number" />
      </div>
    </form>
  )

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <p className="text-xs text-gray-500 text-center">Set a new password</p>
      <Field label="New Password"><input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="New password" /></Field>
      <Field label="Confirm Password"><input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} placeholder="Repeat password" /></Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={false} label="Reset Password" busyLabel="Resetting…" />
    </form>
  )
}
