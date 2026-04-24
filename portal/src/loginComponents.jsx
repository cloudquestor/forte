import config from './config'

export const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

export function MobileInput({ value, onChange, placeholder = '10-digit mobile number' }) {
  return (
    <input type="tel" required inputMode="numeric" maxLength={10} value={value}
           onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
           className={inputCls} placeholder={placeholder} />
  )
}

export function OtpInput({ value, onChange }) {
  return (
    <input type="text" required inputMode="numeric" maxLength={6} value={value}
           onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
           className={`${inputCls} tracking-widest text-center`} placeholder="······" autoFocus />
  )
}

export function PolicyCheckbox({ accepted, onChange }) {
  const [before, after] = config.policyText.split('[[policy]]')
  const link = <a href={config.policyUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline hover:text-brand-800 transition-colors">network usage policy</a>
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={accepted} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-brand-600" />
      <span className="text-xs text-gray-500">{after !== undefined ? <>{before}{link}{after}</> : <>{config.policyText}</>}</span>
    </label>
  )
}

export function SubmitBtn({ busy, disabled, label, busyLabel }) {
  return (
    <button type="submit" disabled={busy || disabled}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-2 rounded-xl text-sm transition-colors">
      {busy ? busyLabel : label}
    </button>
  )
}

export function BackBtn({ onClick, label = '← Back' }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
      {label}
    </button>
  )
}

export function Logo() {
  return (
    <div className="flex flex-col items-center mb-6">
      <img src="/logo.png" alt={config.appName} className="h-16 object-contain mb-3"
           onError={(e) => { e.target.style.display = 'none' }} />
      <p className="text-sm text-gray-500">{config.appTagline}</p>
    </div>
  )
}
