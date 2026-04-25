import { useState, useEffect, useRef } from 'react'
import { requestOtp, verifyOtp } from './api'
import { isEnabled, initWidget, moveCaptchaTo, sendOtp, verifyOtp as msg91Verify, retryOtp, extractToken } from './msg91'
import { getMacAddress, getOmadaParams } from './loginUtils'
import { Field, MobileInput, OtpInput, PolicyCheckbox, SubmitBtn, BackBtn } from './loginComponents'
import config from './config'

export default function OtpForm({ onSuccess, policyAccepted, setPolicyAccepted }) {
  const [mobile, setMobile] = useState('')
  const [code, setCode]     = useState('')
  const [step, setStep]     = useState('mobile')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(config.resendCooldown)

  const useMsg91 = isEnabled()
  const policyRef = useRef(policyAccepted)
  const mobileRef = useRef(mobile)
  useEffect(() => { policyRef.current = policyAccepted }, [policyAccepted])
  useEffect(() => { mobileRef.current = mobile }, [mobile])

  const cooldownRef = useRef(null)

  const startCooldown = () => {
    setCooldown(config.resendCooldown)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => setCooldown(c => {
      if (c <= 1) { clearInterval(cooldownRef.current); return 0 }
      return c - 1
    }), 1000)
  }

  // trigger when entering OTP step
  useEffect(() => {
    if (step === 'otp' || step === 'code') startCooldown()   // 'code' for OtpForm, 'otp' for the other two
    return () => clearInterval(cooldownRef.current)
  }, [step])

  const handleResend = async () => {
    setError(''); setResent(false); setBusy(true)
    try {
      if (useMsg91) { await initWidget(); retryOtp() }
      else { await requestOtp(mobile) }   // signupRequestOtp / resetPasswordRequestOtp per screen
      setResent(true)
      startCooldown()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }


  useEffect(() => {
    if (!useMsg91) return
    window.__msg91Success = async (data) => {
      setBusy(true)
      try {
        const { access_token } = await verifyOtp(mobileRef.current, extractToken(data), getMacAddress(), getOmadaParams(), policyRef.current, true)
        onSuccess(access_token)
      } catch (err) {
        setError(err.message)
        setBusy(false)
      }
    }
    window.__msg91Failure = (err) => { setError(err.message || 'OTP verification failed'); setBusy(false) }
    initWidget().catch(() => {}) 
    moveCaptchaTo('msg91-captcha-slot')
    return () => { window.__msg91Success = null; window.__msg91Failure = null }
  }, [useMsg91])

  
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (useMsg91) { await initWidget(); sendOtp(mobile); setStep('otp') }
      else { await resetPasswordRequestOtp(mobile); setStep('otp') }   // per screen
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }


  const handleVerifyOtp = (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    if (useMsg91) {
      msg91Verify(code)
    } else {
      verifyOtp(mobile, code, getMacAddress(), getOmadaParams(), policyAccepted)
        .then(({ access_token }) => onSuccess(access_token))
        .catch(err => { setError(err.message); setBusy(false) })
    }
  }

  


  if (step === 'mobile') return (
    <form onSubmit={handleRequestOtp} className="space-y-4">
      <Field label="Mobile Number">
        <MobileInput value={mobile} onChange={setMobile} />
      </Field>
      <div id="msg91-captcha-slot" />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <SubmitBtn busy={busy} disabled={!policyAccepted || mobile.length !== 10} label="Send OTP" busyLabel="Sending…" />
    </form>
  )

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <p className="text-sm text-gray-500">OTP sent to <span className="font-medium text-gray-700">{mobile}</span></p>
      <Field label="Enter OTP"><OtpInput value={code} onChange={setCode} /></Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      {resent && <p className="text-green-600 text-xs">OTP resent successfully.</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <SubmitBtn busy={busy} disabled={!policyAccepted || code.length !== 6} label="Verify & Sign In" busyLabel="Verifying…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={handleResend} disabled={busy || cooldown > 0}
                className="text-brand-600 hover:text-brand-800 disabled:opacity-50 transition-colors">
          {cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
        </button>

        <BackBtn onClick={() => { setStep('mobile'); setCode(''); setError('') }} label="← Change number" />
      </div>
    </form>
  )
}
