export function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('redirectUrl') || params.get('redirect') || null
}

export function getMacAddress() {
  const params = new URLSearchParams(window.location.search)
  return params.get('clientMac') || params.get('mac') || null
}

export function getOmadaParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    apMac:      p.get('apMac'),
    ssidName:   p.get('ssidName'),
    radioId:    p.get('radioId'),
    gatewayMac: p.get('gatewayMac'),
    vid:        p.get('vid'),
  }
}

export function isValidMobile(v) { return /^\d{10}$/.test(v) }
