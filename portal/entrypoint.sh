#!/bin/sh
set -e

POLICY_TEXT="${VITE_POLICY_TEXT:-By signing in you agree to the [[policy]].}"

cat > /usr/share/nginx/html/config.js <<'ENDOFSCRIPT'
window.__FORTE_CONFIG__ = {
ENDOFSCRIPT

cat >> /usr/share/nginx/html/config.js <<EOF
  apiUrl:          "${VITE_API_URL:-}",
  defaultRedirect: "${VITE_DEFAULT_REDIRECT:-/status?status=success}",
  appName:         "${VITE_APP_NAME:-Forte WiFi}",
  appTagline:      "${VITE_APP_TAGLINE:-Sign in to access the network}",
EOF

printf '  policyText:      "%s",\n' "$POLICY_TEXT" >> /usr/share/nginx/html/config.js

cat >> /usr/share/nginx/html/config.js <<EOF
  policyUrl:       "${VITE_POLICY_URL:-/policy}",
  tokenKey:        "${VITE_TOKEN_KEY:-forte_token}",
  msg91WidgetId:   "${VITE_MSG91_WIDGET_ID:-}",
  msg91TokenAuth:  "${VITE_MSG91_TOKEN_AUTH:-}",
  resendCooldown:  ${VITE_RESEND_COOLDOWN:-30},
};
EOF

exec nginx -g "daemon off;"
