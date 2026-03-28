import os
import requests
from fastapi import HTTPException
import config
import log

logger = log.get("omada")

OMADA_URL        = os.getenv("OMADA_CONTROLLER_URL", "").rstrip("/")
OMADA_ID         = os.getenv("OMADA_CONTROLLER_ID", "")
OMADA_SITE       = os.getenv("OMADA_SITE_ID", "Default")
OMADA_USERNAME   = os.getenv("OMADA_USERNAME", "")
OMADA_PASSWORD   = os.getenv("OMADA_PASSWORD", "")
OMADA_ENABLED    = bool(OMADA_URL and OMADA_ID and OMADA_USERNAME and OMADA_PASSWORD)

_session: requests.Session | None = None
_csrf_token: str | None = None


def _login() -> tuple[requests.Session, str]:
    global _session, _csrf_token
    if _session and _csrf_token:
        logger.debug("_login: reusing existing session")
        return _session, _csrf_token

    url = f"{OMADA_URL}/{OMADA_ID}/api/v2/hotspot/login"
    logger.debug("_login: POST %s user=%s", url, OMADA_USERNAME)
    s = requests.Session()
    s.verify = False  # allow self-signed certs
    try:
        res = s.post(
            url,
            json={"name": OMADA_USERNAME, "password": OMADA_PASSWORD},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=10,
        )
        logger.debug("_login: response status=%s body=%s", res.status_code, res.text)
        res.raise_for_status()
        data = res.json()
        if data.get("errorCode") != 0:
            logger.debug("_login: errorCode=%s msg=%s", data.get("errorCode"), data.get("msg"))
            raise HTTPException(status_code=500, detail=f"Omada login failed: {data.get('msg')}")
        _csrf_token = data["result"]["token"]
        _session = s
        logger.debug("_login: success csrf_token=%s...", _csrf_token[:8])
        return _session, _csrf_token
    except requests.RequestException as e:
        logger.debug("_login: request exception: %s", e)
        raise HTTPException(status_code=500, detail=f"Omada controller unreachable: {e}")


def _reset() -> None:
    global _session, _csrf_token
    _session = None
    _csrf_token = None


def _ttl_to_microseconds() -> int:
    ttl = config.SESSION_TTL
    if ttl.endswith("h"):
        return int(ttl[:-1]) * 3600 * 1_000_000
    if ttl.endswith("m"):
        return int(ttl[:-1]) * 60 * 1_000_000
    if ttl.endswith("s"):
        return int(ttl[:-1]) * 1_000_000
    return 8 * 3600 * 1_000_000  # default 8h


def _do_authorize(session: requests.Session, csrf: str, payload: dict) -> dict:
    url = f"{OMADA_URL}/{OMADA_ID}/api/v2/hotspot/extPortal/auth"
    logger.debug("_do_authorize: POST %s payload=%s", url, payload)
    res = session.post(
        url,
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Csrf-Token": csrf,
        },
        timeout=10,
    )
    logger.debug("_do_authorize: response status=%s body=%s", res.status_code, res.text)
    res.raise_for_status()
    try:
        return res.json()
    except ValueError:
        logger.debug("_do_authorize: non-JSON response (stale session), body=%s", res.text[:200])
        raise _StaleSession()


class _StaleSession(Exception):
    pass


def authorize_client(
    mac: str,
    ap_mac: str | None = None,
    ssid_name: str | None = None,
    radio_id: str | None = None,
    gateway_mac: str | None = None,
    vid: str | None = None,
) -> None:
    if not OMADA_ENABLED:
        logger.debug("authorize_client: Omada not enabled, skipping")
        return

    logger.debug("authorize_client: mac=%s ap_mac=%s ssid=%s radio_id=%s gw_mac=%s vid=%s",
                 mac, ap_mac, ssid_name, radio_id, gateway_mac, vid)

    if ap_mac:
        payload = {
            "clientMac": mac,
            "apMac": ap_mac,
            "ssidName": ssid_name or "",
            "radioId": radio_id or "0",
            "site": OMADA_SITE,
            "time": _ttl_to_microseconds(),
            "authType": 4,
        }
    else:
        payload = {
            "clientMac": mac,
            "gatewayMac": gateway_mac or "",
            "vid": vid or "1",
            "site": OMADA_SITE,
            "time": _ttl_to_microseconds(),
            "authType": 4,
        }

    logger.debug("authorize_client: payload=%s", payload)
    try:
        session, csrf = _login()
        try:
            data = _do_authorize(session, csrf, payload)
        except _StaleSession:
            logger.debug("authorize_client: stale session, resetting and retrying")
            _reset()
            session, csrf = _login()
            data = _do_authorize(session, csrf, payload)
        if data.get("errorCode") != 0:
            if data.get("errorCode") == -41501:
                logger.debug("authorize_client: client not found on controller (test mode), ignoring")
            else:
                logger.debug("authorize_client: errorCode=%s, resetting session and retrying", data.get("errorCode"))
                _reset()
                session, csrf = _login()
                data = _do_authorize(session, csrf, payload)
                if data.get("errorCode") != 0:
                    logger.debug("authorize_client: retry failed errorCode=%s msg=%s", data.get("errorCode"), data.get("msg"))
                    raise HTTPException(status_code=500, detail=f"Omada authorization failed: {data.get('msg')}")
        logger.debug("authorize_client: success mac=%s", mac)
    except requests.RequestException as e:
        logger.debug("authorize_client: request exception: %s", e)
        raise HTTPException(status_code=500, detail=f"Omada controller error: {e}")


def unauthorize_client(mac: str) -> None:
    if not OMADA_ENABLED:
        logger.debug("unauthorize_client: Omada not enabled, skipping")
        return

    logger.debug("unauthorize_client: mac=%s", mac)
    try:
        session, csrf = _login()
        res = session.post(
            f"{OMADA_URL}/{OMADA_ID}/api/v2/hotspot/extPortal/auth",
            json={"clientMac": mac, "site": OMADA_SITE, "authType": 0},
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Csrf-Token": csrf,
            },
            timeout=10,
        )
        logger.debug("unauthorize_client: response status=%s body=%s", res.status_code, res.text)
    except Exception as e:
        logger.debug("unauthorize_client: exception (best effort): %s", e)
        pass  # best effort
