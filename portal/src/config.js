const rc = window.__FORTE_CONFIG__ ?? {}

const config = {
  apiUrl:           rc.apiUrl           ?? '',
  defaultRedirect:  rc.defaultRedirect  ?? '/status?status=success',
  appName:          rc.appName          ?? 'Forte WiFi',
  appTagline:       rc.appTagline       ?? 'Sign in to access the network',
  policyText:       rc.policyText       ?? 'By signing in you agree to the [[policy]].',
  policyUrl:        rc.policyUrl        ?? '/policy',
  tokenKey:         rc.tokenKey         ?? 'forte_token',
  msg91WidgetId:    rc.msg91WidgetId    ?? '',
  msg91TokenAuth:   rc.msg91TokenAuth   ?? '',
  resendCooldown:  rc.resendCooldown  ?? 30,
}

export default config
