import { useState, useEffect, useRef } from 'react'
import { requestOtp, verifyOtp } from './api'
import { isEnabled, initWidget, moveCaptchaTo, sendOtp, verifyOtp as msg91Verify, retryOtp, extractToken } from './msg91'
import { getMacAddress, getOmadaParams } from './loginUtils'
import { Field, MobileInput, OtpInput, PolicyCheckbox, SubmitBtn, BackBtn } from './loginComponents'

export default function OtpForm({ onSuccess, policyAccepted, setPolicyAccepted }) {
  const [mobile, setMobile] = useState('')
  const [code, setCode]     = useState('')
  const [step, setStep]     = useState('mobile')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const useMsg91 = isEnabled()
  const policyRef = useRef(policyAccepted)
  const mobileRef = useRef(mobile)
  useEffect(() => { policyRef.current = policyAccepted }, [policyAccepted])
  useEffect(() => { mobileRef.current = mobile }, [mobile])

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
    initWidget()
    moveCaptchaTo('msg91-captcha-slot')
    return () => { window.__msg91Success = null; window.__msg91Failure = null }
  }, [useMsg91])

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      if (useMsg91) { sendOtp(mobile); setStep('code') }
      else { await requestOtp(mobile); setStep('code') }
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
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <SubmitBtn busy={busy} disabled={!policyAccepted || code.length !== 6} label="Verify & Sign In" busyLabel="Verifying…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={() => useMsg91 ? retryOtp() : requestOtp(mobile).catch(() => {})}
                className="text-brand-600 hover:text-brand-800 transition-colors">Resend OTP</button>
        <BackBtn onClick={() => { setStep('mobile'); setCode(''); setError('') }} label="← Change number" />
      </div>
    </form>
  )
}
