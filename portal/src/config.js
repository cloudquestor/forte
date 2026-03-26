// config.js — all configurable values read from VITE_ env vars
// Set these in .env.local (dev) or .env.production (prod build)

const config = {
  // Backend API base URL. Empty string = same origin (nginx proxy in prod)
  apiUrl: import.meta.env.VITE_API_URL ?? '',

  // Where to send the user after successful login.
  // Overridden at runtime by ?redirect= query param (set by the router).
  defaultRedirect: import.meta.env.VITE_DEFAULT_REDIRECT
    ?? 'http://captive.apple.com/hotspot-detect.html',

  // Portal branding
  appName:    import.meta.env.VITE_APP_NAME    ?? 'Forte WiFi',
  appTagline: import.meta.env.VITE_APP_TAGLINE ?? 'Sign in to access the network',
  policyText: import.meta.env.VITE_POLICY_TEXT ?? 'By signing in you agree to the network usage policy.',

  // Session storage key for the auth token
  tokenKey: import.meta.env.VITE_TOKEN_KEY ?? 'forte_token',
}

export default config
