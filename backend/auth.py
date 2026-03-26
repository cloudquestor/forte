import re
import secrets
from fastapi import HTTPException
import db
import firewall

MAC_RE = re.compile(r"^([0-9a-f]{2}:){5}[0-9a-f]{2}$", re.IGNORECASE)


def _validate_mac(mac: str) -> str:
    mac = mac.strip().lower()
    if not MAC_RE.match(mac):
        raise HTTPException(status_code=400, detail=f"Invalid MAC address: {mac}")
    return mac


def authenticate(username: str, password: str, mac_address: str | None) -> str:
    if not db.verify_user_password(username, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    mac = _validate_mac(mac_address) if mac_address else None
    db.create_session(token, username, mac)
    db.record_event('login', username)
    if mac:
        firewall.allow(mac)

    return token


def revoke(token: str) -> None:
    username = db.get_session_username(token)
    mac = db.pop_session(token)
    if username:
        db.record_event('logout', username)
    if mac:
        firewall.revoke(mac)
