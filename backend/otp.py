import random
import secrets
import time

import requests
from fastapi import HTTPException

import auth
import config
import db
import log

logger = log.get("otp")


def _verify_msg91_token(token: str) -> None:
    if not config.MSG91_AUTH_KEY:
        raise HTTPException(status_code=500, detail="MSG91 auth key not configured")
    logger.debug("_verify_msg91_token: calling MSG91 with token=%s...", token[:20])
    resp = requests.post(
        "https://control.msg91.com/api/v5/widget/verifyAccessToken",
        json={
            "authkey":      config.MSG91_AUTH_KEY,
            "access-token": token,
        },
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        timeout=10,
    )
    logger.debug("_verify_msg91_token: status=%s body=%s", resp.status_code, resp.text)
    if not resp.ok:
        raise HTTPException(status_code=502, detail="OTP verification service error")
    data = resp.json()
    if data.get("type") != "success":
        raise HTTPException(status_code=401, detail=f"OTP verification failed: {data.get('message', 'unknown error')}")


def _send(mobile: str, code: str) -> None:
    if config.OTP_DUMMY_ENABLED:
        logger.debug("_send: dummy mode, OTP=%s for mobile=%s", code, mobile)
        return
    resp = requests.post(
        "https://control.msg91.com/api/v5/otp",
        json={
            "template_id": config.MSG91_TEMPLATE_ID,
            "mobile":      f"91{mobile}",
            "otp":         code,
        },
        headers={
            "authkey":      config.MSG91_API_KEY,
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    if not resp.ok:
        logger.error("_send: MSG91 error status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to send OTP")
    logger.debug("_send: MSG91 response=%s", resp.json())


def request_otp(mobile: str) -> None:
    code = config.OTP_DUMMY_CODE if config.OTP_DUMMY_ENABLED else str(random.randint(100000, 999999))
    expires_at = int(time.time()) + config.OTP_TTL_SECONDS
    db.upsert_otp(mobile, code, expires_at)
    _send(mobile, code)
    logger.debug("request_otp: otp stored for mobile=%s", mobile)


def _resolve_otp(mobile: str, code: str | None, msg91_token: str | None) -> None:
    if msg91_token:
        _verify_msg91_token(msg91_token)
    elif code:
        if not db.verify_otp(mobile, code):
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    else:
        raise HTTPException(status_code=400, detail="OTP code or token required")


def verify_otp_and_authenticate(
    mobile: str, code: str | None, msg91_token: str | None,
    mac_address: str | None,
    ap_mac: str | None, ssid_name: str | None, radio_id: str | None,
    gateway_mac: str | None, vid: str | None,
) -> str:
    _resolve_otp(mobile, code, msg91_token)
    token = secrets.token_urlsafe(32)
    mac = auth._validate_mac(mac_address) if mac_address else None
    db.create_session(token, mobile, mac)
    db.record_event("login", mobile)
    if mac:
        import firewall
        firewall.allow(mac)
    import omada
    omada.authorize_client(
        mac or "00:00:00:00:00:00",
        ap_mac=ap_mac or "00:00:00:00:00:00",
        ssid_name=ssid_name or "default",
        radio_id=radio_id or "0",
        gateway_mac=gateway_mac,
        vid=vid,
    )
    logger.debug("verify_otp_and_authenticate: session created for mobile=%s mac=%s", mobile, mac)
    return token
