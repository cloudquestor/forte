import re
import secrets
from fastapi import HTTPException
import config
import db
import firewall
import log
import omada

logger = log.get("auth")

MAC_RE = re.compile(r"^([0-9A-Fa-f]{2}([-:])){5}([0-9A-Fa-f]{2})$", re.IGNORECASE)


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

    mac = _validate_mac(mac_address) if mac_address else None

    if mac:
        active_count = db.get_active_mac_count(username)
        if active_count >= config.MAX_MACS_PER_USER:
            oldest = db.get_oldest_mac_session(username)
            if oldest:
                logger.debug("authenticate: evicting oldest mac=%s for user=%s", oldest["mac"], username)
                db.pop_session(oldest["token"])
                db.remove_mac_session(username, oldest["mac"])
                firewall.revoke(oldest["mac"])
                omada.unauthorize_client(oldest["mac"])

    token = secrets.token_urlsafe(32)
    db.create_session(token, username, mac)
    if mac:
        db.add_mac_session(username, mac, token)
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
    logger.debug("authenticate: success user=%s mac=%s", username, mac)
    return token


def revoke(token: str) -> None:
    logger.debug("revoke: token=%s...", token[:8])
    username = db.get_session_username(token)
    mac = db.pop_session(token)
    logger.debug("revoke: user=%s mac=%s", username, mac)
    if mac:
        if username:
            db.remove_mac_session(username, mac)
        firewall.revoke(mac)
        omada.unauthorize_client(mac)
