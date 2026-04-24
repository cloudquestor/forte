import os

# Debug mode — set FORTE_DEBUG=true to enable debug logging
DEBUG: bool = os.getenv("FORTE_DEBUG", "").lower() in ("1", "true", "yes")

# Users — comma-separated "user:pass" pairs
# e.g. FORTE_USERS="admin:secret,guest:guest123"
def _parse_users() -> dict[str, str]:
    raw = os.getenv("FORTE_USERS")
    if not raw:
        raise RuntimeError("FORTE_USERS environment variable is required (e.g. admin:secret,user2:pass2)")
    users = {}
    for pair in raw.split(","):
        pair = pair.strip()
        if ":" in pair:
            u, p = pair.split(":", 1)
            users[u.strip()] = p.strip()
    return users

USERS: dict[str, str] = _parse_users()

# Admins — comma-separated usernames allowed to manage users
# e.g. FORTE_ADMINS="admin,superuser"
ADMIN_USERS: set[str] = {
    u.strip()
    for u in os.getenv("FORTE_ADMINS", "admin").split(",")
    if u.strip()
}

# Session TTL passed to nftables (e.g. "8h", "30m")
SESSION_TTL: str = os.getenv("FORTE_SESSION_TTL", "8h")

# nftables table and set names
NFT_TABLE: str = os.getenv("FORTE_NFT_TABLE", "forte")
NFT_SET:   str = os.getenv("FORTE_NFT_SET",   "allowed_macs")

# When set, nft commands are run inside this Docker container (test rig mode)
ROUTER_CONTAINER: str | None = os.getenv("FORTE_ROUTER_CONTAINER")

# MSG91 OTP integration (optional — if unset, dummy OTP flow is used)
MSG91_API_KEY: str | None = os.getenv("FORTE_MSG91_API_KEY")
MSG91_TEMPLATE_ID: str | None = os.getenv("FORTE_MSG91_TEMPLATE_ID")
OTP_TTL_SECONDS: int = 300  # 5 minutes
OTP_DUMMY_ENABLED: bool = os.getenv("FORTE_OTP_DUMMY", "true").lower() in ("1", "true", "yes")
OTP_DUMMY_CODE: str = os.getenv("FORTE_OTP_DUMMY_CODE", "123456")

def _parse_list(env_key: str, default: list[str]) -> list[str]:
    raw = os.getenv(env_key, '').strip()
    return [v.strip() for v in raw.split(',') if v.strip()] if raw else default

BUILDINGS: list[str]    = _parse_list('FORTE_BUILDINGS', [])
TOWER_NUMBERS: list[str] = _parse_list('FORTE_TOWER_NUMBERS', [])
BLOCKS: list[str]       = _parse_list('FORTE_BLOCKS', [])
FLOORS: list[str]       = _parse_list('FORTE_FLOORS', [])

# Omada controller integration (optional)
# OMADA_CONTROLLER_ID is the identifier in the controller URL path
# e.g. https://192.168.1.1:8043/abcdefghijklmnopqrstuvwxyzabcdef/ → ID is abcdefghijklmnopqrstuvwxyzabcdef
OMADA_CONTROLLER_ID: str = os.getenv("OMADA_CONTROLLER_ID", "")

# CORS — comma-separated allowed origins
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("FORTE_CORS_ORIGINS", "http://localhost:5173").split(",")
]
