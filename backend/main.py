from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import auth
import config

app = FastAPI(title="Forte Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["POST", "DELETE"],
    allow_headers=["Content-Type"],
)


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
