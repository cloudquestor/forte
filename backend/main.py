import re
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import auth
import config
import db
import log
import otp as otp_module

logger = log.get("main")

MOBILE_RE = re.compile(r'^\d{10}$')


def _validate_mobile(mobile: str) -> str:
    if not MOBILE_RE.match(mobile):
        raise HTTPException(status_code=422, detail="Mobile number must be exactly 10 digits")
    return mobile


app = FastAPI(title="Forte Auth API")


@app.on_event("startup")
def startup():
    logger.info("Forte backend starting up (debug=%s)", config.DEBUG)
    db.init()


app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)


def _require_admin(authorization: str) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    username = db.get_session_username(token)
    if not username or username not in config.ADMIN_USERS:
        raise HTTPException(status_code=403, detail="Admin access required")


class LoginRequest(BaseModel):
    username:        str
    password:        str
    mac_address:     str | None = None
    ap_mac:          str | None = None
    ssid_name:       str | None = None
    radio_id:        str | None = None
    gateway_mac:     str | None = None
    vid:             str | None = None
    policy_accepted: bool = False


@app.post("/api/auth/login")
def login(body: LoginRequest):
    if not body.policy_accepted:
        raise HTTPException(status_code=400, detail="You must accept the network usage policy")
    logger.debug("POST /api/auth/login user=%s mac=%s", body.username, "present" if body.mac_address else "absent")
    token = auth.authenticate(
        body.username, body.password, body.mac_address,
        ap_mac=body.ap_mac, ssid_name=body.ssid_name, radio_id=body.radio_id,
        gateway_mac=body.gateway_mac, vid=body.vid,
    )
    db.record_event('policy_accepted', body.username)
    return {"access_token": token, "token_type": "bearer"}


@app.delete("/api/auth/logout")
def logout(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ").strip()
    auth.revoke(token)
    return {"status": "logged out"}


class OtpRequestBody(BaseModel):
    mobile: str


class OtpVerifyRequest(BaseModel):
    mobile:          str
    code:            str
    mac_address:     str | None = None
    ap_mac:          str | None = None
    ssid_name:       str | None = None
    radio_id:        str | None = None
    gateway_mac:     str | None = None
    vid:             str | None = None
    policy_accepted: bool = False


@app.post("/api/auth/otp/request")
def otp_request(body: OtpRequestBody):
    _validate_mobile(body.mobile)
    otp_module.request_otp(body.mobile)
    return {"status": "otp sent"}


@app.post("/api/auth/otp/verify")
def otp_verify(body: OtpVerifyRequest):
    if not body.policy_accepted:
        raise HTTPException(status_code=400, detail="You must accept the network usage policy")
    _validate_mobile(body.mobile)
    token = otp_module.verify_otp_and_authenticate(
        body.mobile, body.code, body.mac_address,
        ap_mac=body.ap_mac, ssid_name=body.ssid_name, radio_id=body.radio_id,
        gateway_mac=body.gateway_mac, vid=body.vid,
    )
    db.record_event("policy_accepted", body.mobile)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/options")
def get_options():
    return {
        "buildings":     config.BUILDINGS,
        "tower_numbers": config.TOWER_NUMBERS,
        "blocks":        config.BLOCKS,
        "floors":        config.FLOORS,
    }


# ── Self-service signup (OTP-verified) ────────────────────────────────────────

class SignupOtpRequest(BaseModel):
    mobile: str


class SignupRequest(BaseModel):
    mobile:       str
    code:         str
    password:     str
    first_name:   str = ''
    last_name:    str = ''
    tower_name:   str | None = None
    tower_number: int | None = None
    block:        str = ''
    flat_number:  int | None = None


@app.post("/api/auth/signup/otp")
def signup_otp(body: SignupOtpRequest):
    _validate_mobile(body.mobile)
    if db.mobile_exists(body.mobile):
        raise HTTPException(status_code=409, detail="An account with this mobile number already exists")
    otp_module.request_otp(body.mobile)
    return {"status": "otp sent"}


@app.post("/api/auth/signup", status_code=201)
def signup(body: SignupRequest):
    _validate_mobile(body.mobile)
    if db.mobile_exists(body.mobile):
        raise HTTPException(status_code=409, detail="An account with this mobile number already exists")
    if not db.verify_otp(body.mobile, body.code):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    db.create_user(
        username=body.mobile,
        plain=body.password,
        first_name=body.first_name,
        last_name=body.last_name,
        tower_name=body.tower_name,
        tower_number=body.tower_number,
        block=body.block,
        flat_number=body.flat_number,
        mobile=body.mobile,
    )
    return {"username": body.mobile}


# ── Account lookup + password reset (OTP-verified) ───────────────────────────

class LookupRequest(BaseModel):
    mobile: str


@app.post("/api/auth/lookup")
def lookup(body: LookupRequest):
    _validate_mobile(body.mobile)
    user = db.find_user_by_mobile(body.mobile)
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this mobile number")
    return {"first_name": user["first_name"], "last_name": user["last_name"]}


class ResetPasswordOtpRequest(BaseModel):
    mobile: str


class ResetPasswordRequest(BaseModel):
    mobile:   str
    code:     str
    password: str


@app.post("/api/auth/reset-password/otp")
def reset_password_otp(body: ResetPasswordOtpRequest):
    _validate_mobile(body.mobile)
    if not db.find_user_by_mobile(body.mobile):
        raise HTTPException(status_code=404, detail="No account found for this mobile number")
    otp_module.request_otp(body.mobile)
    return {"status": "otp sent"}


@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordRequest):
    _validate_mobile(body.mobile)
    if not db.verify_otp(body.mobile, body.code):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    if not db.reset_password_by_mobile(body.mobile, body.password):
        raise HTTPException(status_code=404, detail="No account found for this mobile number")
    return {"status": "password reset"}


# ── Admin: stats + user management ───────────────────────────────────────────

@app.get("/api/stats")
def get_stats(authorization: str = Header(...)):
    _require_admin(authorization)
    return db.get_stats()


@app.get("/api/users")
def list_users(authorization: str = Header(...)):
    _require_admin(authorization)
    return db.list_users()


class CreateUserRequest(BaseModel):
    username:     str
    password:     str
    first_name:   str = ''
    last_name:    str = ''
    tower_name:   str | None = None
    tower_number: int | None = None
    block:        str = ''
    flat_number:  int | None = None
    mobile:       str | None = None


@app.post("/api/users", status_code=201)
def create_user(body: CreateUserRequest, authorization: str = Header(...)):
    _require_admin(authorization)
    if db.user_exists(body.username):
        raise HTTPException(status_code=409, detail="User already exists")
    if body.mobile and db.mobile_exists(body.mobile):
        raise HTTPException(status_code=409, detail="Mobile number already registered")
    db.create_user(body.username, body.password, body.first_name, body.last_name,
                   body.tower_name, body.tower_number, body.block, body.flat_number, body.mobile)
    return {"username": body.username}


class UpdateUserRequest(BaseModel):
    first_name:   str = ''
    last_name:    str = ''
    tower_name:   str | None = None
    tower_number: int | None = None
    block:        str = ''
    flat_number:  int | None = None


@app.put("/api/users/{username}")
def update_user(username: str, body: UpdateUserRequest, authorization: str = Header(...)):
    _require_admin(authorization)
    if not db.update_user(username, body.first_name, body.last_name,
                          body.tower_name, body.tower_number, body.block, body.flat_number):
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "updated"}


class UpdatePasswordRequest(BaseModel):
    password: str


@app.put("/api/users/{username}/password")
def update_password(username: str, body: UpdatePasswordRequest, authorization: str = Header(...)):
    _require_admin(authorization)
    if not db.update_password(username, body.password):
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "updated"}


@app.delete("/api/users/{username}")
def delete_user(username: str, authorization: str = Header(...)):
    _require_admin(authorization)
    if not db.delete_user(username):
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted"}
