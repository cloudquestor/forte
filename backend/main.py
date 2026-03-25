from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import secrets
import subprocess
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "DELETE"],
    allow_headers=["Content-Type"],
)

# TODO: replace with real DB lookup
USERS = {
    "admin": "password123",
}

# In-memory token → MAC mapping  (replace with Redis/DynamoDB later)
sessions: dict[str, str] = {}   # token → mac_address

MAC_RE = re.compile(r"^([0-9a-f]{2}:){5}[0-9a-f]{2}$", re.IGNORECASE)


def _validate_mac(mac: str) -> str:
    mac = mac.strip().lower()
    if not MAC_RE.match(mac):
        raise HTTPException(status_code=400, detail=f"Invalid MAC address: {mac}")
    return mac


def _nft(args: list[str]) -> None:
    """Run an nft command; silently skip if nft is not available (dev environment)."""
    try:
        subprocess.run(["nft"] + args, check=True, capture_output=True)
    except FileNotFoundError:
        pass   # nft not present in dev — no-op
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr.decode())


class LoginRequest(BaseModel):
    username: str
    password: str
    mac_address: str | None = None   # client MAC, sent by portal after DHCP lease lookup


@app.post("/api/auth/login")
def login(body: LoginRequest):
    expected = USERS.get(body.username)
    if not expected or expected != body.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    mac = _validate_mac(body.mac_address) if body.mac_address else None

    if mac:
        sessions[token] = mac
        # Punch a hole in the captive portal firewall for this MAC
        _nft(["add", "element", "inet", "forte", "allowed_macs", f"{{ {mac} timeout 8h }}"])

    return {"access_token": token, "token_type": "bearer"}


@app.delete("/api/auth/logout")
def logout(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ").strip()
    mac = sessions.pop(token, None)
    if mac:
        # Remove MAC from the firewall allowlist immediately
        _nft(["delete", "element", "inet", "forte", "allowed_macs", f"{{ {mac} }}"])
    return {"status": "logged out"}
