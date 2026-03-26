import re
import secrets
from fastapi import HTTPException
import db
import firewall
import log
import omada

logger = log.get("auth")

MAC_RE = re.compile(r"^([0-9a-f]{2}:){5}[0-9a-f]{2}$", re.IGNORECASE)


def _validate_mac(mac: str) -> str:
    mac = mac.strip().lower()
    if not MAC_RE.match(mac):
        raise HTTPException(status_code=400, detail=f"Invalid MAC address: {mac}")
    return mac


def authenticate(
    username: str, password: str, mac_address: str | None,
    ap_mac: str | None = None, ssid_name: str | None = None, radio_id: str | None = None,
    gateway_mac: str | None = None, vid: str | None = None,
) -> str:
    logger.debug("authenticate: user=%s mac=%s ap_mac=%s ssid=%s radio_id=%s gw_mac=%s vid=%s",
                 username, mac_address, ap_mac, ssid_name, radio_id, gateway_mac, vid)
    if not db.verify_user_password(username, password):
        logger.debug("authenticate: invalid credentials for user=%s", username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    mac = _validate_mac(mac_address) if mac_address else None
    db.create_session(token, username, mac)
    db.record_event('login', username)
    logger.debug("authenticate: session created for user=%s mac=%s", username, mac)
    if mac:
        logger.debug("authenticate: calling firewall.allow mac=%s", mac)
        firewall.allow(mac)
    effective_mac = mac or "00:00:00:00:00:00"
    logger.debug("authenticate: calling omada.authorize_client mac=%s", effective_mac)
    omada.authorize_client(
        effective_mac,
        ap_mac=ap_mac or "00:00:00:00:00:00",
        ssid_name=ssid_name or "default",
        radio_id=radio_id or "0",
        gateway_mac=gateway_mac,
        vid=vid,
    )
    logger.debug("authenticate: omada.authorize_client completed mac=%s", effective_mac)

    logger.debug("authenticate: success user=%s", username)
    return token


def revoke(token: str) -> None:
    logger.debug("revoke: token=%s...", token[:8])
    username = db.get_session_username(token)
    mac = db.pop_session(token)
    logger.debug("revoke: user=%s mac=%s", username, mac)
    if username:
        db.record_event('logout', username)
    if mac:
        logger.debug("revoke: calling firewall.revoke mac=%s", mac)
        firewall.revoke(mac)
        logger.debug("revoke: calling omada.unauthorize_client mac=%s", mac)
        omada.unauthorize_client(mac)
        logger.debug("revoke: omada.unauthorize_client completed mac=%s", mac)
