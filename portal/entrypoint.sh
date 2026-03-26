#!/bin/sh
set -e

cat > /usr/share/nginx/html/config.js <<EOF
window.__FORTE_CONFIG__ = {
  apiUrl:          "${VITE_API_URL:-}",
  defaultRedirect: "${VITE_DEFAULT_REDIRECT:-http://captive.apple.com/hotspot-detect.html}",
  appName:         "${VITE_APP_NAME:-Forte WiFi}",
  appTagline:      "${VITE_APP_TAGLINE:-Sign in to access the network}",
  policyText:      "${VITE_POLICY_TEXT:-By signing in you agree to the network usage policy.}",
  tokenKey:        "${VITE_TOKEN_KEY:-forte_token}",
};
EOF

exec nginx -g "daemon off;"
