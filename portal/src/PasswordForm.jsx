import { useState } from 'react'
import { login } from './api'
import { getMacAddress, getOmadaParams } from './loginUtils'
import { Field, MobileInput, PolicyCheckbox, SubmitBtn, inputCls } from './loginComponents'

export default function PasswordForm({ onSuccess, policyAccepted, setPolicyAccepted, onSignup, onForgot }) {
  const [mobile, setMobile]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
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
               onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Enter your password" />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <PolicyCheckbox accepted={policyAccepted} onChange={setPolicyAccepted} />
      <SubmitBtn busy={busy} disabled={!policyAccepted || mobile.length !== 10} label="Sign In" busyLabel="Signing in…" />
      <div className="flex justify-between text-xs pt-1">
        <button type="button" onClick={onForgot} className="text-brand-600 hover:text-brand-800 transition-colors">Forgot password?</button>
        <button type="button" onClick={onSignup} className="text-brand-600 hover:text-brand-800 transition-colors">Create account</button>
      </div>
    </form>
  )
}
