import { useState, useEffect } from 'react'
import { signupRequestOtp, signupVerifyAndCreate } from './api'
import { isEnabled, initWidget, moveCaptchaTo, sendOtp, verifyOtp as msg91Verify, retryOtp, extractToken } from './msg91'
import { Field, MobileInput, OtpInput, SubmitBtn, BackBtn } from './loginComponents'

const EMPTY = { mobile: '', code: '', msg91Token: '', password: '', confirm: '' }
const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function SignupForm({ onBack }) {
  const [form, setForm]       = useState(EMPTY)
  const [step, setStep]       = useState('mobile')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [success, setSuccess] = useState(false)
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  const setE = (k) => (e) => set(k)(e.target.value)
  const useMsg91 = isEnabled()

  useEffect(() => {
    if (!useMsg91) return
    window.__msg91Success = (data) => { set('msg91Token')(extractToken(data)); setStep('details'); setBusy(false) }
    window.__msg91Failure = (err) => { setError(err.message || 'OTP verification failed'); setBusy(false) }
    initWidget()
    moveCaptchaTo('msg91-captcha-slot')
    return () => { window.__msg91Success = null; window.__msg91Failure = null }
  }, [useMsg91])

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (useMsg91) { sendOtp(form.mobile); setStep('otp') }
      else { await signupRequestOtp(form.mobile); setStep('otp') }
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (form.code.length !== 6) { setError('Enter the 6-digit OTP'); return }
    setError('')
    if (useMsg91) { setBusy(true); msg91Verify(form.code) }
    else setStep('details')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setError(''); setBusy(true)
    try {
      await signupVerifyAndCreate({ mobile: form.mobile, msg91Token: form.msg91Token || null, code: form.code || null, password: form.password })
      setSuccess(true)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  if (success) return (
    <div className="space-y-4 text-center">
      <div className="text-green-600 text-4xl">✓</div>
      <p className="text-sm font-medium text-gray-700">Account created!</p>
      <p className="text-xs text-gray-500">Sign in with your mobile number and password.</p>
      <button type="button" onClick={onBack} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl text-sm transition-colors">Back to Sign In</button>
    </div>
  )

  if (step === 'mobile') return (
    <form onSubmit={handleRequestOtp} className="space-y-4">
      <p className="text-xs text-gray-500 text-center">We'll send an OTP to verify your number</p>
      <Field label="Mobile Number"><MobileInput value={form.mobile} onChange={set('mobile')} /></Field>
      <div id="msg91-captcha-slot" />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={form.mobile.length !== 10} label="Send OTP" busyLabel="Sending…" />
      <BackBtn onClick={onBack} />
    </form>
  )

  if (step === 'otp') return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <p className="text-sm text-gray-500">OTP sent to <span className="font-medium text-gray-700">{form.mobile}</span></p>
      <Field label="Enter OTP"><OtpInput value={form.code} onChange={set('code')} /></Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={form.code.length !== 6} label="Verify OTP" busyLabel="Verifying…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={() => useMsg91 ? retryOtp() : signupRequestOtp(form.mobile).catch(() => {})}
                className="text-brand-600 hover:text-brand-800 transition-colors">Resend OTP</button>
        <BackBtn onClick={() => { setStep('mobile'); setError('') }} label="← Change number" />
      </div>
    </form>
  )

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <p className="text-xs text-gray-500 text-center">Choose a password for your account</p>
      <Field label="Password"><input type="password" required autoComplete="new-password" value={form.password} onChange={setE('password')} className={inputCls} placeholder="Choose a password" /></Field>
      <Field label="Confirm Password"><input type="password" required autoComplete="new-password" value={form.confirm} onChange={setE('confirm')} className={inputCls} placeholder="Repeat password" /></Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <SubmitBtn busy={busy} disabled={false} label="Create Account" busyLabel="Creating…" />
    </form>
  )
}
