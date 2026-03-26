import re
import secrets
from fastapi import HTTPException
import config
import firewall

MAC_RE = re.compile(r"^([0-9a-f]{2}:){5}[0-9a-f]{2}$", re.IGNORECASE)

# token → mac  (replace with Redis / DynamoDB in production)
_sessions: dict[str, str] = {}


def _validate_mac(mac: str) -> str:
    mac = mac.strip().lower()
    if not MAC_RE.match(mac):
        raise HTTPException(status_code=400, detail=f"Invalid MAC address: {mac}")
    return mac


def authenticate(username: str, password: str, mac_address: str | None) -> str:
    expected = config.USERS.get(username)
    if not expected or expected != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)

    if mac_address:
        mac = _validate_mac(mac_address)
        _sessions[token] = mac
        firewall.allow(mac)

    return token


def revoke(token: str) -> None:
    mac = _sessions.pop(token, None)
    if mac:
        firewall.revoke(mac)
