const rc = window.__FORTE_CONFIG__ ?? {}

const config = {
  apiUrl:          rc.apiUrl          ?? '',
  defaultRedirect: rc.defaultRedirect ?? 'http://captive.apple.com/hotspot-detect.html',
  appName:         rc.appName         ?? 'Forte WiFi',
  appTagline:      rc.appTagline      ?? 'Sign in to access the network',
  policyText:      rc.policyText      ?? 'By signing in you agree to the network usage policy.',
  tokenKey:        rc.tokenKey        ?? 'forte_token',
}

export default config
