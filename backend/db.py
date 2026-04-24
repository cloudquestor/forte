import sqlite3
import os
import hashlib
import config

DB_PATH = os.getenv("FORTE_DB_PATH", "/data/forte.db")


def hash_password(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


def _check_password(plain: str, hashed: str) -> bool:
    return hashlib.sha256(plain.encode()).hexdigest() == hashed


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                mobile   TEXT
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token    TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                mac      TEXT
            );
            CREATE TABLE IF NOT EXISTS otps (
                mobile     TEXT PRIMARY KEY,
                code       TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                username   TEXT NOT NULL,
                ts         INTEGER NOT NULL DEFAULT (strftime('%s','now'))
            );
        """)
        existing = {r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
        if 'mobile' not in existing:
            conn.execute("ALTER TABLE users ADD COLUMN mobile TEXT")
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_mobile ON users(mobile) WHERE mobile IS NOT NULL"
        )
    _seed_users()


def _seed_users():
    if not config.USERS:
        return
    with get_conn() as conn:
        for username, plain in config.USERS.items():
            row = conn.execute(
                "SELECT password FROM users WHERE username = ?", (username,)
            ).fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO users (username, password) VALUES (?, ?)",
                    (username, hash_password(plain)),
                )
            else:
                # Re-hash if stored value is not a 64-char hex SHA-256 (e.g. old bcrypt hash)
                if len(row["password"]) != 64:
                    conn.execute(
                        "UPDATE users SET password = ? WHERE username = ?",
                        (hash_password(plain), username),
                    )


def list_users() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT username, mobile FROM users ORDER BY username"
        ).fetchall()
    return [dict(r) for r in rows]


def delete_user(username: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM users WHERE username = ?", (username,))
    return cur.rowcount > 0


def update_password(username: str, plain: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE users SET password = ? WHERE username = ?",
            (hash_password(plain), username),
        )
    return cur.rowcount > 0


def verify_user_password(username: str, plain: str) -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT password FROM users WHERE username = ?", (username,)).fetchone()
    return bool(row and _check_password(plain, row["password"]))


def create_user(username: str, plain: str, mobile: str | None = None) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (username, password, mobile) VALUES (?, ?, ?)",
            (username, hash_password(plain), mobile),
        )


def mobile_exists(mobile: str) -> bool:
    with get_conn() as conn:
        return bool(conn.execute("SELECT 1 FROM users WHERE mobile = ?", (mobile,)).fetchone())


def find_user_by_mobile(mobile: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT username FROM users WHERE mobile = ?", (mobile,)
        ).fetchone()
    return dict(row) if row else None


def reset_password_by_mobile(mobile: str, plain: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE users SET password = ? WHERE mobile = ?",
            (hash_password(plain), mobile),
        )
    return cur.rowcount > 0


def user_exists(username: str) -> bool:
    with get_conn() as conn:
        return bool(conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone())


def create_session(token: str, username: str, mac: str | None):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (token, username, mac) VALUES (?, ?, ?)",
            (token, username, mac),
        )


def record_event(event_type: str, username: str) -> None:
    with get_conn() as conn:
        conn.execute("INSERT INTO events (event_type, username) VALUES (?, ?)", (event_type, username))


def get_stats() -> dict:
    with get_conn() as conn:
        total_users    = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        active_sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        total_logins   = conn.execute("SELECT COUNT(*) FROM events WHERE event_type='login'").fetchone()[0]
        total_logouts  = conn.execute("SELECT COUNT(*) FROM events WHERE event_type='logout'").fetchone()[0]
    return {
        "total_users": total_users,
        "active_sessions": active_sessions,
        "total_logins": total_logins,
        "total_logouts": total_logouts,
    }


def pop_session(token: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute("SELECT mac FROM sessions WHERE token = ?", (token,)).fetchone()
        if row:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return row["mac"] if row else None


def upsert_otp(mobile: str, code: str, expires_at: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO otps (mobile, code, expires_at) VALUES (?, ?, ?)"
            " ON CONFLICT(mobile) DO UPDATE SET code=excluded.code, expires_at=excluded.expires_at",
            (mobile, code, expires_at),
        )


def verify_otp(mobile: str, code: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT code, expires_at FROM otps WHERE mobile = ?", (mobile,)
        ).fetchone()
        if not row:
            return False
        import time
        if time.time() > row["expires_at"]:
            conn.execute("DELETE FROM otps WHERE mobile = ?", (mobile,))
            return False
        if row["code"] != code:
            return False
        conn.execute("DELETE FROM otps WHERE mobile = ?", (mobile,))
    return True


def get_session_username(token: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute("SELECT username FROM sessions WHERE token = ?", (token,)).fetchone()
    return row["username"] if row else None
