import random
import secrets
import time

import requests
from fastapi import HTTPException

import auth
import config
import db
import firewall
import log
import omada

logger = log.get("otp")


def _send(mobile: str, code: str) -> None:
    if config.OTP_DUMMY_ENABLED:
        logger.debug("_send: dummy mode, OTP=%s for mobile=%s", code, mobile)
        return
    resp = requests.post(
        "https://control.msg91.com/api/v5/otp",
        json={
            "template_id": config.MSG91_TEMPLATE_ID,
            "mobile":      mobile,
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


def verify_otp_and_authenticate(
    mobile: str, code: str, mac_address: str | None,
    ap_mac: str | None, ssid_name: str | None, radio_id: str | None,
    gateway_mac: str | None, vid: str | None,
) -> str:
    if not db.verify_otp(mobile, code):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")

    mac = auth._validate_mac(mac_address) if mac_address else None

    if mac:
        active_count = db.get_active_mac_count(mobile)
        if active_count >= config.MAX_MACS_PER_USER:
            oldest = db.get_oldest_mac_session(mobile)
            if oldest:
                logger.debug("verify_otp_and_authenticate: evicting oldest mac=%s for mobile=%s", oldest["mac"], mobile)
                db.pop_session(oldest["token"])
                db.remove_mac_session(mobile, oldest["mac"])
                firewall.revoke(oldest["mac"])
                omada.unauthorize_client(oldest["mac"])

    token = secrets.token_urlsafe(32)
    db.create_session(token, mobile, mac)
    if mac:
        db.add_mac_session(mobile, mac, token)
        firewall.allow(mac)

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
