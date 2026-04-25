import config from './config'

let scriptLoading = null
let scriptReady = false
let widgetPromise = null

const captchaEl = document.createElement('div')
captchaEl.id = 'msg91-captcha'
document.body.appendChild(captchaEl)

function loadScript() {
  if (scriptReady) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://verify.msg91.com/otp-provider.js'
    s.onload = () => { scriptReady = true; resolve() }
    document.head.appendChild(s)
  })
  return scriptLoading
}

export function initWidget() {
  if (widgetPromise) return widgetPromise
  widgetPromise = loadScript().then(() => new Promise((resolve) => {
    window.initSendOTP({
      widgetId:        config.msg91WidgetId,
      tokenAuth:       config.msg91TokenAuth,
      exposeMethods:   true,
      captchaRenderId: 'msg91-captcha',
      success: (data) => window.__msg91Success?.(data),
      failure: (err)  => window.__msg91Failure?.(err),
    })
    const poll = setInterval(() => {
      if (typeof window.sendOtp === 'function') { clearInterval(poll); resolve() }
    }, 50)
  }))
  return widgetPromise
}

export function moveCaptchaTo(slotId) {
  const slot = document.getElementById(slotId)
  if (slot && captchaEl.parentNode !== slot) slot.appendChild(captchaEl)
}

export function isEnabled() {
  return !!(config.msg91WidgetId && config.msg91TokenAuth)
}

// export function sendOtp(mobile) { window.sendOtp(`91${mobile}`) }
export function sendOtp(mobile) {
  if (typeof window.sendOtp !== 'function') throw new Error('OTP service unavailable. Please try again.')
  window.sendOtp(`91${mobile}`)
}
export function verifyOtp(code) { window.verifyOtp(code) }
export function retryOtp() { window.retryOtp?.('11') }
export function extractToken(data) { return data.message ?? data['access-token'] }
