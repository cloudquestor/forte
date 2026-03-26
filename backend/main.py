from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import auth
import config
import db

app = FastAPI(title="Forte Auth API")

@app.on_event("startup")
def startup():
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
    username: str
    password: str
    mac_address: str | None = None


@app.post("/api/auth/login")
def login(body: LoginRequest):
    token = auth.authenticate(body.username, body.password, body.mac_address)
    return {"access_token": token, "token_type": "bearer"}


@app.delete("/api/auth/logout")
def logout(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ").strip()
    auth.revoke(token)
    return {"status": "logged out"}


@app.get("/health")
def health():
    return {"status": "ok"}


class CreateUserRequest(BaseModel):
    username:     str
    password:     str
    first_name:   str = ''
    last_name:    str = ''
    tower_name:   str | None = None
    tower_number: int | None = None
    block:        str = ''
    flat_number:  int | None = None


@app.get("/api/stats")
def get_stats(authorization: str = Header(...)):
    _require_admin(authorization)
    return db.get_stats()


@app.get("/api/users")
def list_users(authorization: str = Header(...)):
    _require_admin(authorization)
    return db.list_users()


@app.post("/api/users", status_code=201)
def create_user(body: CreateUserRequest, authorization: str = Header(...)):
    _require_admin(authorization)
    if db.user_exists(body.username):
        raise HTTPException(status_code=409, detail="User already exists")
    db.create_user(body.username, body.password, body.first_name, body.last_name,
                   body.tower_name, body.tower_number, body.block, body.flat_number)
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
